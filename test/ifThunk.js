/* global describe, it */

import * as Graph from '@buggyorg/graphtools'
import thunkIf from '../src/main'
import chai from 'chai'
import fs from 'fs'

const expect = chai.expect

const ifNode = (data) =>
  Object.assign({
    componentId: 'if',
    ports: [
      {
        kind: 'input',
        type: 'Boolean',
        port: 'condition'
      },
      {
        kind: 'input',
        type: 'generic',
        port: 'inTrue'
      },
      {
        kind: 'input',
        type: 'generic',
        port: 'inFalse'
      },
      {
        kind: 'output',
        type: 'generic',
        port: 'choice'
      }
    ],
    atomic: true
  }, data)

describe('» If to ThunkIf', () => {
  it('can create and compare graphs', () => {
    const graph = Graph.flow(
      Graph.addNode(ifNode({name: 'if'})),
      Graph.addNode({name: 'a', ports: [{port: 'out', kind: 'output', type: 'Number'}]}),
      Graph.addNode({name: 'b', ports: [{port: 'out', kind: 'output', type: 'Number'}]}),
      Graph.addEdge({from: 'a@out', to: 'if@inTrue'}),
      Graph.addEdge({from: 'b@out', to: 'if@inFalse'}),
      Graph.addEdge({from: '@cond', to: 'if@condition'}),
      Graph.addEdge({from: 'if@choice', to: '@out'})
    )(Graph.compound({ports: [{port: 'cond', kind: 'input', type: 'Bool'}, {port: 'out', kind: 'output', type: 'generic'}]}))

    const rewGraph = thunkIf(graph)
    expect(Graph.hasNode('/ifThunk', rewGraph)).to.be.true
    expect(Graph.hasNode('/if', rewGraph)).to.not.be.true
    expect(Graph.nodesBy('/functional/lambda', rewGraph)).to.have.length(2)
    expect(Graph.edges(rewGraph)).to.have.length(4)
  })

  it.only('can handle recursive nodes', () => {
    const graph = Graph.fromJSON(JSON.parse(fs.readFileSync('test/fixtures/fac.json', 'utf8')))
    const rewGraph = thunkIf(graph)
    expect(graph).to.be.ok
    expect(Graph.hasNode('/ifThunk', rewGraph)).to.be.true
    expect(Graph.hasNode('/if', rewGraph)).to.not.be.true
    expect(Graph.nodesBy('/functional/lambda', rewGraph)).to.have.length(2)
  })
})
