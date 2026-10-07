// Décode une polyline encodée (format Google, utilisé par Strava pour map.summary_polyline) en [[lat, lng], …].
export function decoderPolyline(code) {
  const points = []
  let i = 0
  let lat = 0
  let lng = 0
  const suivant = () => {
    let res = 0
    let dec = 0
    let b
    do {
      b = code.charCodeAt(i++) - 63
      res |= (b & 0x1f) << dec
      dec += 5
    } while (b >= 0x20 && i < code.length)
    return res & 1 ? ~(res >> 1) : res >> 1
  }
  while (i < code.length) {
    lat += suivant()
    lng += suivant()
    points.push([lat / 1e5, lng / 1e5])
  }
  return points
}
