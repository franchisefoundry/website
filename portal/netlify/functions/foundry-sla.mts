// Netlify scheduled function: runs the Foundry intro SLA sweep every 15 minutes.
// Needs CRON_SECRET set on the ffportal site. URL is provided by Netlify.
export default async () => {
  const res = await fetch(`${process.env.URL}/api/cron/foundry-sla`, {
    method: 'POST',
    headers: { authorization: `Bearer ${process.env.CRON_SECRET ?? ''}` },
  })
  console.log('[foundry-sla]', res.status, await res.text())
}

export const config = { schedule: '*/15 * * * *' }
