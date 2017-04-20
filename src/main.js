
import * as Rewrite from '@buggyorg/rewrite'
import * as Graph from '@buggyorg/graphtools'

const Algorithm = Graph.Algorithm
const Node = Graph.Node
const GraphRew = Graph.Rewrite

const thunkInputType = (type) =>
  ({
    name: 'Function',
    data: [
      {
        name: 'arguments',
        data: []
      },
      {
        name: 'returnValues',
        data: [type]
      }
    ]
  })

const ifThunk = (ifNode) =>
  ({
    componentId: 'ifThunk',
    ports: [
      {port: 'condition', kind: 'input', type: 'Bool'},
      {port: 'inTrue', kind: 'input', type: thunkInputType(Node.inputPort('inTrue', ifNode).type)},
      {port: 'inFalse', kind: 'input', type: thunkInputType(Node.inputPort('inFalse', ifNode).type)},
      {port: 'choice', kind: 'output', type: Node.outputPort('choice', ifNode).type}
    ],
    atomic: true
  })

export default (graph, handleNonRecursives = false) => Rewrite.rewrite([Rewrite.applyNode(
  (node, graph) => {
    if (Node.component(node) !== 'if') return false
    const lca = Algorithm.lowestCommonAncestors([Node.port('inTrue', node), Node.port('inFalse', node)], graph)
    const subsetA = Algorithm.predecessorsUpTo(Node.port('inTrue', node), lca, graph)
    const subsetB = Algorithm.predecessorsUpTo(Node.port('inFalse', node), lca, graph)
    const all = subsetA.concat(subsetB)
    if (!handleNonRecursives &&
        all.filter((n) => Graph.get('isRecursive', n, graph)).length === 0) return false
    if (subsetA.length === 0 || subsetB.length === 0) return false
    return [node, subsetA, subsetB]
  },
  ([node, subsetA, subsetB], graph) => {
    const parent = Graph.parent(node, graph)
    return Graph.flow(
      Graph.Let([
        Graph.addNodeIn(parent, ifThunk(node)),
        GraphRew.replaceByThunk(parent, subsetA),
        GraphRew.replaceByThunk(parent, subsetB)
      ], ([ifThunk, lambdaA, lambdaB], graph) => {
        return Graph.flow(
          Graph.addEdge({from: Node.port('fn', lambdaA[1]), to: Node.port('inTrue', ifThunk)}),
          Graph.addEdge({from: Node.port('fn', lambdaB[1]), to: Node.port('inFalse', ifThunk)}),
          Graph.addEdge({from: Graph.predecessor(Node.port('condition', node), graph), to: Node.port('condition', ifThunk)}),
          Graph.successors(Node.port('choice', node), graph).map((s) =>
            Graph.addEdge({from: Node.port('choice', ifThunk), to: s}))
        )(graph)
      }),
      Graph.removeNode(node)
    )(graph)
  },
  {
    name: 'convert if to ifThunk',
    constraints: {
      requires: ['resolve'],
      before: ['typify']
    }
  }
)])(graph)
