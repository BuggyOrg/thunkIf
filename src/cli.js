#!/usr/bin/env node
import * as cliExt from 'cli-ext'
import thunkIfs from './main'

cliExt.input(process.argv[2])
.then((graphStr) => {
  var graph
  try {
    graph = JSON.parse(graphStr)
  } catch (err) {
    throw Error('[Resolve] Cannot parse input JSON.')
  }
  return thunkIfs(graph)
})
.then((res) => console.log(JSON.stringify(res, null, 2)))
.catch((err) => {
  console.error(err.stack || err)
  process.exitCode = 1
})
