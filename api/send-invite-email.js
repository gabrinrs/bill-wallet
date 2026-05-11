// api/send-invite-email.js — Vercel Serverless Function
// Invia email di invito a contatti esterni quando vengono inclusi in uno split
// Chiamato dal trigger PostgreSQL su split_partecipanti (INSERT con contatto_esterno_id)
// Usa fetch diretto all'API Mailgun (nessuna dipendenza aggiuntiva)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const apiKey = req.headers['x-api-key']
  if (apiKey !== process.env.NOTIFICATIONS_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const { to_email, to_name, from_name, importo, nota } = req.body

  if (!to_email || !from_name) {
    return res.status(400).json({ error: 'Campi obbligatori: to_email, from_name' })
  }

  try {
    const importoFormatted = importo
      ? `€${Number(importo).toFixed(2).replace('.', ',')}`
      : ''

    const subject = `${from_name} ha diviso una spesa con te su Bolly`

    const htmlBody = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background-color:#f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:480px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
          <tr>
            <td style="background:linear-gradient(145deg,#00897B,#00695C);padding:32px 24px;text-align:center;">
              <h1 style="margin:0;font-family:'Pacifico',cursive;color:#ffffff;font-size:28px;font-weight:normal;">Bolly</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 24px;">
              <p style="margin:0 0 16px;font-size:16px;color:#1a1a1a;">
                Ciao${to_name ? ' ' + to_name : ''},
              </p>
              <p style="margin:0 0 16px;font-size:16px;color:#1a1a1a;">
                <strong>${from_name}</strong> ha diviso una spesa con te${importoFormatted ? ' di <strong>' + importoFormatted + '</strong>' : ''}${nota ? ' per &ldquo;' + nota + '&rdquo;' : ''}.
              </p>
              <p style="margin:0 0 24px;font-size:16px;color:#1a1a1a;">
                Registrati su Bolly per tenere traccia delle spese condivise e non dimenticare pi&ugrave; nessuna scadenza!
              </p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="https://getbolly.app" style="display:inline-block;padding:14px 32px;background:linear-gradient(145deg,#00897B,#00695C);color:#ffffff;text-decoration:none;font-size:16px;font-weight:600;border-radius:12px;">
                      Registrati su Bolly
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 24px 24px;border-top:1px solid #eee;">
              <p style="margin:0;font-size:12px;color:#999;text-align:center;">
                Bolly &mdash; Mai pi&ugrave; scadenze dimenticate.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

    const textBody = [
      `Ciao${to_name ? ' ' + to_name : ''},`,
      '',
      `${from_name} ha diviso una spesa con te${importoFormatted ? ' di ' + importoFormatted : ''}${nota ? ' per "' + nota + '"' : ''}.`,
      '',
      'Registrati su Bolly per tenere traccia delle spese condivise!',
      'https://getbolly.app',
      '',
      'Bolly — Mai più scadenze dimenticate.',
    ].join('\n')

    // Invio diretto via Mailgun API (EU) con fetch + form-data
    const form = new URLSearchParams()
    form.append('from', 'Bolly <noreply@mail.getbolly.app>')
    form.append('to', to_email)
    form.append('subject', subject)
    form.append('html', htmlBody)
    form.append('text', textBody)

    const mgRes = await fetch('https://api.eu.mailgun.net/v3/mail.getbolly.app/messages', {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from('api:' + process.env.MAILGUN_API_KEY).toString('base64'),
      },
      body: form,
    })

    if (!mgRes.ok) {
      const errText = await mgRes.text()
      throw new Error(`Mailgun error ${mgRes.status}: ${errText}`)
    }

    return res.status(200).json({ message: 'Email inviata', to: to_email })

  } catch (err) {
    console.error('Errore send-invite-email:', err)
    return res.status(500).json({ error: err.message })
  }
}
