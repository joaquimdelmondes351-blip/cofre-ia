const PREPARATION_MESSAGE = 'Assistente em preparação. A IA será ativada assim que a conexão segura for concluída.'

function getBearerToken(headerValue) {
  if (!headerValue || typeof headerValue !== 'string') {
    return null
  }

  const match = headerValue.match(/^Bearer\s+(.+)$/i)
  return match ? match[1].trim() : null
}

function getOpenAiResponsesText(payload) {
  if (typeof payload?.output_text === 'string' && payload.output_text.trim()) {
    return payload.output_text.trim()
  }

  const output = Array.isArray(payload?.output) ? payload.output : []

  for (const item of output) {
    const content = Array.isArray(item?.content) ? item.content : []
    for (const part of content) {
      if (part?.type === 'output_text' && typeof part?.text === 'string' && part.text.trim()) {
        return part.text.trim()
      }
    }
  }

  return PREPARATION_MESSAGE
}

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ message: PREPARATION_MESSAGE })
  }

  const authorizationHeader = request.headers.authorization
  const token = getBearerToken(authorizationHeader)

  if (!token) {
    return response.status(401).json({ message: PREPARATION_MESSAGE })
  }

  const hasFirebaseAdminConfig = Boolean(
    process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PRIVATE_KEY
  )

  const apiKey = process.env.OPENAI_API_KEY
  const model = process.env.OPENAI_MODEL

  if (!hasFirebaseAdminConfig || !apiKey || !model) {
    return response.status(200).json({ message: PREPARATION_MESSAGE })
  }

  try {
    const admin = await import('firebase-admin')

    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        }),
      })
    }

    const decodedToken = await admin.auth().verifyIdToken(token)
    const uid = decodedToken?.uid

    if (!uid) {
      return response.status(401).json({ message: PREPARATION_MESSAGE })
    }

    const { question, context } = request.body ?? {}

    if (!question || typeof question !== 'string') {
      return response.status(400).json({ message: PREPARATION_MESSAGE })
    }

    const normalizedQuestion = question.trim()

    if (!normalizedQuestion || normalizedQuestion.length > 250) {
      return response.status(400).json({ message: PREPARATION_MESSAGE })
    }

    const input = [
      'Você é um assistente financeiro profissional do COFRE IA.',
      'Responda de forma segura, útil e objetiva.',
      'Nunca invente dados financeiros reais. Use apenas o contexto informado pelo usuário.',
      'Se não houver contexto suficiente, diga que precisa de mais informações.',
      `Contexto do usuário: ${JSON.stringify(context ?? {})}`,
      `Pergunta: ${normalizedQuestion}`,
    ].join('\n')

    const openAiResponse = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        input,
      }),
    })

    if (!openAiResponse.ok) {
      return response.status(200).json({ message: PREPARATION_MESSAGE })
    }

    const payload = await openAiResponse.json()
    const answer = getOpenAiResponsesText(payload)

    return response.status(200).json({ answer })
  } catch {
    return response.status(200).json({ message: PREPARATION_MESSAGE })
  }
}
