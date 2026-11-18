import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createPlanner, fare } from '../src/routing.js';

const networkPath = path.resolve(process.cwd(), 'data/network.json');
const network = JSON.parse(fs.readFileSync(networkPath, 'utf8'));
const planner = createPlanner(network);

test('network.json has unique stop IDs and all line stops exist', () => {
  const stopIds = new Set();
  for (const stop of network.stops) {
    assert.ok(!stopIds.has(stop.id), `Duplicate stop id: ${stop.id}`);
    stopIds.add(stop.id);
    assert.equal(typeof stop.lat, 'number');
    assert.equal(typeof stop.lng, 'number');
  }

  for (const line of network.lines) {
    for (const sid of line.stops) {
      assert.ok(stopIds.has(sid), `Line ${line.id} references unknown stop ${sid}`);
    }
  }
});

test('rM Howrah–Bardhaman local includes all main line stations up to Bardhaman', () => {
  const rM = network.lines.find((line) => line.id === 'rM');
  assert.ok(rM, 'Line rM must exist');
  assert.equal(rM.name, 'Howrah–Bardhaman local');
  assert.equal(rM.mode, 'rail');

  const stopNameById = Object.fromEntries(network.stops.map((s) => [s.id, s.name]));
  const rMStopNames = rM.stops.map((id) => stopNameById[id]);

  assert.equal(rM.stops[0], 'HWH');
  assert.equal(rMStopNames[rMStopNames.length - 1], 'Bardhaman');

  const expectedAfterBandel = [
    'Adisaptagram',
    'Magra',
    'Talandu',
    'Khanyan',
    'Pandua',
    'Simlagarh',
    'Bainchi',
    'Debipur',
    'Memari',
    'Bagila',
    'Nimo',
    'Rasulpur',
    'Palsit',
    'Saktigarh',
    'Gangpur',
    'Bardhaman',
  ];

  const tail = rMStopNames.slice(-expectedAfterBandel.length);
  assert.deepEqual(tail, expectedAfterBandel);
});

test('Serampore to Bardhaman uses exactly one rail leg', () => {
  const result = planner.planTrip('Serampore', 'Bardhaman');
  assert.ok(result.options.length > 0, 'Expected at least one route option');

  const route = result.options[0];
  assert.equal(route.legs.length, 1, 'Expected exactly one leg');
  assert.equal(route.legs[0].mode, 'rail', 'Expected the single leg to be rail');
  assert.equal(route.legs[0].lineId, 'rM');
  assert.equal(route.legs[0].lineName, 'Howrah–Bardhaman local');
  assert.equal(route.legs[0].from, 'SRP');
  assert.equal(route.legs[0].to, 'BWN');
  assert.equal(route.legs[0].fare, fare('rail', route.legs[0].km));
});
