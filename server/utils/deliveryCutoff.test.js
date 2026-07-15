import test from 'node:test'
import assert from 'node:assert/strict'
import { getDeliverySchedule, getCountdownInfo } from './deliveryCutoff.js'

const settings = { cutoffTime: '08:00', windowStart: '09:00', windowEnd: '14:00' }

test('same-day delivery before the cutoff', () => {
  const result = getDeliverySchedule(new Date('2026-07-04T07:59:00'), settings)
  assert.equal(result.isSameDay, true)
  assert.equal(result.deliveryDate, '2026-07-04')
  assert.equal(result.deliveryScheduleStatus, 'TODAY')
})

test('next-day delivery at or after the cutoff', () => {
  const result = getDeliverySchedule(new Date('2026-07-04T08:00:00'), settings)
  assert.equal(result.isSameDay, false)
  assert.equal(result.deliveryDate, '2026-07-05')
  assert.equal(result.deliveryScheduleStatus, 'TOMORROW')
})

test('custom cutoff time is honored', () => {
  const custom = { ...settings, cutoffTime: '10:00' }
  const result = getDeliverySchedule(new Date('2026-07-04T10:00:00'), custom)
  assert.equal(result.isSameDay, false)
  assert.equal(result.deliveryDate, '2026-07-05')
})

test('countdown reports remaining time before cutoff', () => {
  const now = new Date('2026-07-04T07:00:00')
  const info = getCountdownInfo(settings, now)
  assert.equal(info.isPastCutoff, false)
  assert.equal(info.msRemaining, 60 * 60 * 1000)
})

test('countdown reports closed window after cutoff', () => {
  const now = new Date('2026-07-04T09:00:00')
  const info = getCountdownInfo(settings, now)
  assert.equal(info.isPastCutoff, true)
  assert.equal(info.msRemaining, 0)
})