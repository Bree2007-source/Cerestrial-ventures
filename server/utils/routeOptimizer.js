/**
 * Route optimizer for a single driver's multi-stop deliveries.
 *
 * Strategy: OSRM's Trip service solves the whole multi-stop ordering in
 * ONE request — driver location + all stop coordinates in, one optimized
 * visiting order out, using real road distances. This replaces the old
 * per-stop Google Distance Matrix loop, which didn't scale past ~20-25
 * stops per driver.
 *
 * Uses the public OSRM demo server by default (router.project-osrm.org).
 * That server is free but rate-limited and not meant for heavy production
 * traffic — set OSRM_BASE_URL to a self-hosted OSRM instance when ready.
 *
 * If OSRM is unreachable (network error, rate limit, bad response), falls
 * back to a straight-line (haversine) nearest-neighbor ordering so dispatch
 * never silently breaks — flagged with isEstimate so the UI can be honest
 * about it not being a real road route.
 */

const OSRM_BASE_URL = process.env.OSRM_BASE_URL || 'https://router.project-osrm.org'
const STALE_LOCATION_MS = 10 * 60 * 1000 // 10 minutes

function haversineKm(a, b) {
  const R = 6371
  const dLat = (b.lat - a.lat) * Math.PI / 180
  const dLng = (b.lng - a.lng) * Math.PI / 180
  const lat1 = a.lat * Math.PI / 180
  const lat2 = b.lat * Math.PI / 180
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.asin(Math.sqrt(h))
}

// Rough Nairobi-area assumption for fallback travel time: ~25 km/h average
// including stops/traffic. Clearly an estimate, not a road calculation.
function estimateMinutesFromKm(km) {
  return Math.round((km / 25) * 60)
}

/**
 * Nearest-neighbor ordering using straight-line distance only. Used when
 * OSRM can't be reached. Not a real road route — always flagged isEstimate.
 */
function haversineNearestNeighbor(driverLocation, orders) {
  const remaining = [...orders]
  const result = []
  let currentPoint = { lat: driverLocation.lat, lng: driverLocation.lng }

  while (remaining.length > 0) {
    let best = { index: 0, km: Infinity }
    remaining.forEach((o, i) => {
      const km = haversineKm(currentPoint, o.coordinates)
      if (km < best.km) best = { index: i, km }
    })
    const chosen = remaining.splice(best.index, 1)[0]
    result.push({
      orderId: chosen._id,
      sequence: result.length,
      distanceKm: Math.round(best.km * 10) / 10,
      durationMin: estimateMinutesFromKm(best.km),
      isEstimate: true,
    })
    currentPoint = chosen.coordinates
  }

  return result
}

/**
 * Calls OSRM's Trip service with the driver's location as a fixed start
 * point and all order coordinates as stops to visit, in one request.
 * Returns stops in OPTIMIZED VISITING ORDER (not input order), each with
 * the road distance/duration for the leg leading into that stop.
 */
async function osrmTrip(driverLocation, orders) {
  // OSRM wants "lng,lat" — the reverse of how we store coordinates.
  const coordsList = [driverLocation, ...orders.map(o => o.coordinates)]
  const coordStr = coordsList.map(c => `${c.lng},${c.lat}`).join(';')

  const url = `${OSRM_BASE_URL}/trip/v1/driving/${coordStr}` +
    `?source=first&roundtrip=false&overview=false`

  const res = await fetch(url)
  if (!res.ok) throw new Error(`OSRM HTTP ${res.status}`)
  const data = await res.json()
  if (data.code !== 'Ok') throw new Error(`OSRM status: ${data.code}`)

  const trip = data.trips[0]
  const waypoints = data.waypoints // aligned with coordsList input order; index 0 = driver

  const orderWaypoints = waypoints.slice(1).map((wp, i) => ({
    order: orders[i],
    tripIndex: wp.waypoint_index, // position in the optimized trip (1 = first stop, since 0 = driver start)
  }))

  orderWaypoints.sort((a, b) => a.tripIndex - b.tripIndex)

  return orderWaypoints.map((ow, i) => {
    const leg = trip.legs[i] // leg[i] = travel from trip position i to i+1; i=0 is "driver start -> first stop"
    return {
      orderId: ow.order._id,
      sequence: i,
      distanceKm: leg ? Math.round((leg.distance / 1000) * 10) / 10 : null,
      durationMin: leg ? Math.round(leg.duration / 60) : null,
      isEstimate: false,
    }
  })
}

/**
 * @param {{lat:number, lng:number, updatedAt?: Date}} driverLocation
 * @param {Array<{_id:any, coordinates:{lat:number,lng:number}}>} orders - pending stops for this driver
 * @returns {Promise<Array<{orderId:any, sequence:number, distanceKm:number, durationMin:number, isEstimate:boolean}>>}
 */
export async function optimizeRoute(driverLocation, orders) {
  const validOrders = orders.filter(o => o.coordinates?.lat && o.coordinates?.lng)
  if (validOrders.length === 0) return []

  const locationIsStale = driverLocation?.updatedAt
    ? (Date.now() - new Date(driverLocation.updatedAt).getTime()) > STALE_LOCATION_MS
    : true

  const hasUsableLocation = driverLocation?.lat && driverLocation?.lng && !locationIsStale

  // If we don't have a fresh driver location at all, fall back to the order
  // each was originally assigned in (createdAt order) rather than guessing
  // a start point — better to be predictable than to fabricate a route.
  if (!hasUsableLocation) {
    return validOrders
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
      .map((o, i) => ({
        orderId: o._id,
        sequence: i,
        distanceKm: null,
        durationMin: null,
        isEstimate: true,
      }))
  }

  try {
    return await osrmTrip(driverLocation, validOrders)
  } catch {
    // OSRM unreachable / rate-limited / bad response — fall back so
    // dispatch never silently breaks, but flag the result as an estimate.
    return haversineNearestNeighbor(driverLocation, validOrders)
  }
}