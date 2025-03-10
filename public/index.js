// -------------------- Map and Node Loading --------------------
var map = L.map("map").setView([40.744183, -111.926158], 14);

L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution:
    '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
}).addTo(map);

const nodes = {};

function loadNodes(data) {
  const graphmlData = data;
  // Parse the XML data
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(graphmlData, "text/xml");

  // Get all nodes
  const nodeElements = xmlDoc.getElementsByTagName("node");
  for (const nodeElem of nodeElements) {
    const nodeId = nodeElem.getAttribute("id");
    const lat = nodeElem.querySelector('data[key="d1"]').textContent;
    const lon = nodeElem.querySelector('data[key="d2"]').textContent;
    nodes[nodeId] = { lat: parseFloat(lat), lon: parseFloat(lon), adj: [] };
  }

  // Get all edges
  const edgeElements = xmlDoc.getElementsByTagName("edge");
  for (const edge of edgeElements) {
    const source = edge.getAttribute("source");
    const target = edge.getAttribute("target");
    const weight = edge.querySelector('data[key="d11"]').textContent;

    // Store edge data for both directions
    nodes[source].adj.push({ target: target, weight: weight });
    nodes[target].adj.push({ target: source, weight: weight });
  }

  // Remove any nodes with no adjacent edges
  for (const node in nodes) {
    if (nodes[node].adj.length === 0) {
      delete nodes[node];
    }
  }

  // Draw red markers for each node with a tooltip for the node id.
  // Markers are now bigger (radius 5) and respond to click events.
  for (const node in nodes) {
    const lat = nodes[node].lat;
    const lon = nodes[node].lon;
    const marker = L.circleMarker([lat, lon], {
      color: 'red', // Color of the dot
      radius: 3     // Bigger dot size
    })
      .bindTooltip(node, { direction: "top" }) // Shows node id on hover
      .addTo(map);
      
    // Save the node id in the marker for later reference.
    marker.nodeId = node;
    
    // On click, copy the id to clipboard and set as start or end.
    marker.on('click', function(e) {
      const nodeId = this.nodeId;
      // Copy to clipboard
      navigator.clipboard.writeText(nodeId);
      // Ask the user: OK for start, Cancel for end.
      const isStart = confirm("Set node " + nodeId + " as START node? Click OK for start, Cancel for end.");
      if (isStart) {
        document.getElementById("startNode").value = nodeId;
      } else {
        document.getElementById("endNode").value = nodeId;
      }
    });
  }
}

fetch("asaltnew.graphml")
  .then((response) => response.text())
  .then(loadNodes);

// -------------------- Edge Mapping (Start Button) --------------------
function mapEdges() {
  for (const node in nodes) {
    for (const adj of nodes[node].adj) {
      var latLngs = [
        [nodes[node].lat, nodes[node].lon],
        [nodes[adj.target].lat, nodes[adj.target].lon],
      ];
      // Draw edge and store the layer so it can be cleared later.
      const edgeLayer = L.polyline(latLngs, {
        color: "grey", // Line color
        weight: 4,      // Line width
        opacity: 1,     // Line opacity
      }).addTo(map);
      drawnLayers.push(edgeLayer);
    }
  }
}

document.querySelector("#start").addEventListener("click", mapEdges);

// -------------------- Dijkstra's Algorithm --------------------
// -------------------- Priority Queue Class --------------------
class PriorityQueue {
  constructor() {
    this.heap = [];
    this.indices = new Map(); // Map each node to its current index in the heap.
  }
  
  isEmpty() {
    return this.heap.length === 0;
  }
  
  swap(i, j) {
    const temp = this.heap[i];
    this.heap[i] = this.heap[j];
    this.heap[j] = temp;
    this.indices.set(this.heap[i].node, i);
    this.indices.set(this.heap[j].node, j);
  }
  
  bubbleUp(i) {
    while (i > 0) {
      let parent = Math.floor((i - 1) / 2);
      if (this.heap[i].priority < this.heap[parent].priority) {
        this.swap(i, parent);
        i = parent;
      } else {
        break;
      }
    }
  }
  
  bubbleDown(i) {
    const n = this.heap.length;
    while (true) {
      let left = 2 * i + 1;
      let right = 2 * i + 2;
      let smallest = i;
      if (left < n && this.heap[left].priority < this.heap[smallest].priority) {
        smallest = left;
      }
      if (right < n && this.heap[right].priority < this.heap[smallest].priority) {
        smallest = right;
      }
      if (smallest !== i) {
        this.swap(i, smallest);
        i = smallest;
      } else {
        break;
      }
    }
  }
  
  enqueue(node, priority) {
    if (this.indices.has(node)) {
      // If the node is already in the heap, decrease its priority if the new one is lower.
      let i = this.indices.get(node);
      if (priority < this.heap[i].priority) {
        this.heap[i].priority = priority;
        this.bubbleUp(i);
      }
    } else {
      const entry = { node, priority };
      this.heap.push(entry);
      let i = this.heap.length - 1;
      this.indices.set(node, i);
      this.bubbleUp(i);
    }
  }
  
  dequeue() {
    if (this.isEmpty()) return null;
    const min = this.heap[0];
    const last = this.heap.pop();
    this.indices.delete(min.node);
    if (this.heap.length > 0) {
      this.heap[0] = last;
      this.indices.set(last.node, 0);
      this.bubbleDown(0);
    }
    return min;
  }
}

// -------------------- Global Variables and Helpers --------------------
const delay = 100; // Animation delay in milliseconds

// Global array to store drawn layers (parent tree, final path, markers, and start edges)
let drawnLayers = [];

function clearDrawnPaths() {
  drawnLayers.forEach(layer => {
    map.removeLayer(layer);
  });
  drawnLayers = [];
}

document.querySelector("#clear").addEventListener("click", clearDrawnPaths);

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// -------------------- Dijkstra's Algorithm Using PriorityQueue --------------------
async function dijkstra() {
  // Read start and end node IDs from input boxes.
  const sourceId = document.getElementById("startNode").value;
  const targetId = document.getElementById("endNode").value;
  
  if (!sourceId || !targetId) {
    alert("Please specify both start and end nodes using the input boxes.");
    return;
  }
  
  if (!nodes[sourceId] || !nodes[targetId]) {
    alert("Invalid node id(s) provided!");
    return;
  }
  
  alert("Dijkstra's algorithm:\nStart: " + sourceId + "\nEnd: " + targetId);
	const sourceMarker = L.circleMarker([nodes[sourceId].lat, nodes[sourceId].lon], {
    color: 'green',
    radius: 5,
    fillColor: 'green',
    fillOpacity: 1
  }).addTo(map);
  
  const distances = {};
  const prev = {};
  for (const node in nodes) {
    distances[node] = Infinity;
    prev[node] = null;
  }
  distances[sourceId] = 0;
  
  // Initialize our custom priority queue.
  const pq = new PriorityQueue();
  for (const node in nodes) {
    pq.enqueue(node, distances[node]);
  }
  
  const branchLayers = [];
  
  while (!pq.isEmpty()) {
    const { node: u, priority: d } = pq.dequeue();
    
    // Animate current node processing with a green marker.
    const currentMarker = L.circleMarker([nodes[u].lat, nodes[u].lon], {
      color: 'green',
      radius: 5
    }).addTo(map);
    
    if (u === targetId) {
      await sleep(delay);
      map.removeLayer(currentMarker);
      break;
    }
    
    // Relaxation: update distances for all adjacent nodes.
    for (const edge of nodes[u].adj) {
      const v = edge.target;
      const weight = parseFloat(edge.weight);
      const alt = distances[u] + weight;
      if (alt < distances[v]) {
        distances[v] = alt;
        prev[v] = u;
        pq.enqueue(v, alt); // This will update the priority if v is already in the queue.
        // Animate branch relaxation with a blue line.
        const branchLine = L.polyline(
          [
            [nodes[u].lat, nodes[u].lon],
            [nodes[v].lat, nodes[v].lon]
          ],
          { color: "blue", weight: 2, opacity: 0.7 }
        ).addTo(map);
        branchLayers.push(branchLine);
      }
    }
    
    await sleep(delay);
    map.removeLayer(currentMarker);
  }
  
  // Reconstruct the shortest path from source to target.
  const path = [];
  let u = targetId;
  if (prev[u] !== null || u === sourceId) {
    while (u !== null) {
      path.unshift(u);
      u = prev[u];
    }
  } else {
    alert("No path found from " + sourceId + " to " + targetId + "!");
    return;
  }
  
  // Remove branch lines used during animation.
  branchLayers.forEach(layer => map.removeLayer(layer));
  
  // -------------------- Draw the Parent Tree --------------------
  // For each node (except the source), if it has a parent then draw an edge from the parent to the node.
  for (const node in nodes) {
    if (prev[node] !== null) {
      const parentEdge = L.polyline(
        [
          [nodes[node].lat, nodes[node].lon],
          [nodes[prev[node]].lat, nodes[prev[node]].lon]
        ],
        { color: "blue", weight: 2, opacity: 1 }
      ).addTo(map);
      drawnLayers.push(parentEdge);
    }
  }
  
  // Draw final shortest path as a thicker blue polyline.
  const latLngs = path.map(nodeId => [nodes[nodeId].lat, nodes[nodeId].lon]);
  const finalPath = L.polyline(latLngs, {
    color: "yellow",
    weight: 4,
    opacity: 1,
  }).addTo(map);
  drawnLayers.push(finalPath);
  
  // -------------------- Mark the Source and Destination --------------------
  const targetMarker = L.circleMarker([nodes[targetId].lat, nodes[targetId].lon], {
    color: 'red',
    radius: 5,
    fillColor: 'red',
    fillOpacity: 1
  }).addTo(map);
  drawnLayers.push(sourceMarker);
  drawnLayers.push(targetMarker);
  
  alert("Shortest path distance: " + distances[targetId]);
}

document.querySelector("#dijkstra").addEventListener("click", dijkstra);


document.querySelector("#dijkstra").addEventListener("click", dijkstra);

// -------------------- Minimum Spanning Tree (Prim's) --------------------
async function minimumSpanningTree() {
  const nodeIds = Object.keys(nodes);
  if (nodeIds.length === 0) {
    alert("No nodes available!");
    return;
  }

  const startId = nodeIds[0];
  const visited = new Set();
  visited.add(startId);

  // We'll add each drawn MST edge to the drawnLayers global array.
  const edgeQueue = [];

  function addEdges(nodeId) {
    for (const edge of nodes[nodeId].adj) {
      if (!visited.has(edge.target)) {
        edgeQueue.push({
          source: nodeId,
          target: edge.target,
          weight: parseFloat(edge.weight)
        });
      }
    }
  }

  addEdges(startId);

  while (visited.size < nodeIds.length && edgeQueue.length > 0) {
    edgeQueue.sort((a, b) => a.weight - b.weight);
    const edge = edgeQueue.shift();
    if (visited.has(edge.target)) continue;

    visited.add(edge.target);
    addEdges(edge.target);

    // Draw each MST edge as a purple line.
    const polyline = L.polyline(
      [
        [nodes[edge.source].lat, nodes[edge.source].lon],
        [nodes[edge.target].lat, nodes[edge.target].lon]
      ],
      { color: "purple", weight: 4, opacity: 1 }
    ).addTo(map);
    drawnLayers.push(polyline);

    // Optional: briefly animate the new node with a blue marker.
    const marker = L.circleMarker([nodes[edge.target].lat, nodes[edge.target].lon], {
      color: 'blue',
      radius: 5
    }).addTo(map);
    await sleep(delay);
    map.removeLayer(marker);
  }

  alert("Minimum spanning tree complete.");
}

document.querySelector("#mst").addEventListener("click", minimumSpanningTree);

// -------------------- Kruskal's Algorithm --------------------
async function kruskal() {
  // Gather unique edges (avoid duplicates since the graph is undirected)
  const edges = [];
  const seen = new Set();
  for (const source in nodes) {
    for (const edge of nodes[source].adj) {
      const target = edge.target;
      // Create a unique key using sorted node IDs.
      const key = source < target ? source + "_" + target : target + "_" + source;
      if (seen.has(key)) continue;
      seen.add(key);
      edges.push({
        source: source,
        target: target,
        weight: parseFloat(edge.weight)
      });
    }
  }

  // Sort edges by weight (ascending)
  edges.sort((a, b) => a.weight - b.weight);

  // Initialize union–find structure.
  const parent = {};
  const rank = {};
  for (const node in nodes) {
    parent[node] = node;
    rank[node] = 0;
  }
  function find(n) {
    if (parent[n] !== n) {
      parent[n] = find(parent[n]);
    }
    return parent[n];
  }
  function union(n1, n2) {
    const root1 = find(n1);
    const root2 = find(n2);
    if (root1 === root2) return false;
    if (rank[root1] < rank[root2]) {
      parent[root1] = root2;
    } else if (rank[root1] > rank[root2]) {
      parent[root2] = root1;
    } else {
      parent[root2] = root1;
      rank[root1]++;
    }
    return true;
  }

  // Process each edge: if it connects two different sets, add it to the MST.
  for (const edge of edges) {
    if (find(edge.source) !== find(edge.target)) {
      union(edge.source, edge.target);
      // Animate by drawing the MST edge in orange.
      const polyline = L.polyline(
        [
          [nodes[edge.source].lat, nodes[edge.source].lon],
          [nodes[edge.target].lat, nodes[edge.target].lon]
        ],
        { color: "blue", weight: 4, opacity: 1 }
      ).addTo(map);
      drawnLayers.push(polyline);
      await sleep(delay);
    }
  }

  alert("Kruskal's MST complete.");
}

document.querySelector("#kruskal").addEventListener("click", kruskal);
