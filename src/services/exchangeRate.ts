export async function fetchUsdToThb(): Promise<number> {
  const res = await fetch('/api/exchangerate/v6/latest/USD')
  if (!res.ok) throw new Error('Exchange rate fetch failed')
  const data = await res.json()
  return data.rates?.THB ?? 35
}
