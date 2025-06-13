//Available map locations
const places = [
  ["salt.graphml", [40.744183, -111.926158]],
  ["charleston.graphml", [32.766927, -79.973006]],
	["kathmandu.graphml", [27.705155, 85.326990]],
];

// Initialize the map with select element's first location using leaflet.js
const selectElem = document.getElementById("placeSelect");


var placeidx = Number(selectElem.value);
var place = places[placeidx];
var placename = place[0];
var placepos = place[1];

var map = L.map("map").setView(placepos, 14);

L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution:
    '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
}).addTo(map);


// Global variables to store graph
let nodes = {};
let drawnNodes = [];

// Function to load nodes when load button is clicked
function loadNodes(data) {
	for (const node of drawnNodes) map.removeLayer(node);
	nodes = {};
	drawnNodes = [];

	map.setView(placepos, 14);

  const graphmlData = data;

  // Parse the XML data
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(graphmlData, "text/xml");

	// Get the keys for the attributes
  const nodeKeys = {};
  const edgeKeys = {};
  const keyElements = xmlDoc.getElementsByTagName("key");
  for (const keyElem of keyElements) {
    const id = keyElem.getAttribute("id");
    const attrName = keyElem.getAttribute("attr.name");
    const forAttr = keyElem.getAttribute("for");
    if (forAttr === "node") {
      nodeKeys[attrName] = id;
    } else if (forAttr === "edge") {
      edgeKeys[attrName] = id;
    }
  }

  // "y" for latitude and "x" for longitude.
  const yKey = nodeKeys["y"];
  const xKey = nodeKeys["x"];

  // "length" key to get road distance
  const lengthKey = edgeKeys["length"];

  // Store the nodes with empty adjancency list
  const nodeElements = xmlDoc.getElementsByTagName("node");
  for (const nodeElem of nodeElements) {
    const nodeId = nodeElem.getAttribute("id");
    const lat = nodeElem.querySelector(`data[key="${yKey}"]`).textContent;
    const lon = nodeElem.querySelector(`data[key="${xKey}"]`).textContent;
    nodes[nodeId] = { lat: parseFloat(lat), lon: parseFloat(lon), adj: [] };
  }

  // Add the edges to the adjacency list
  const edgeElements = xmlDoc.getElementsByTagName("edge");
  for (const edge of edgeElements) {
    const source = edge.getAttribute("source");
    const target = edge.getAttribute("target");
    const weight = edge.querySelector(`data[key="${lengthKey}"]`).textContent;

		// Undirected graph so edges on both ends
    nodes[source].adj.push({ target: target, weight: weight });
    nodes[target].adj.push({ target: source, weight: weight });
  }

	// Remove nodes with no edges
  for (const node in nodes) {
    if (nodes[node].adj.length === 0) {
      delete nodes[node];
    }
  }

	// Display the nodes on map with red markers and ID tooltip
  for (const node in nodes) {
    const lat = nodes[node].lat;
    const lon = nodes[node].lon;
    const marker = L.circleMarker([lat, lon], {
      color: "red",
      radius: 3,
    })
      .bindTooltip(node, { direction: "top" })
      .addTo(map);

    marker.nodeId = node;

		// Event listener to copy and select node ID
    marker.on("click", function (e) {
      const nodeId = this.nodeId;
      navigator.clipboard.writeText(nodeId);
      const isStart = confirm(
        "Set node " +
          nodeId +
          " as START node? Click OK for start, Cancel for end."
      );
      if (isStart) {
        document.getElementById("startNode").value = nodeId;
      } else {
        document.getElementById("endNode").value = nodeId;
      }
    });

		// Add the marker to the drawnNodes array so that it can be removed later if needed
		drawnNodes.push(marker);
  }
}

// Fetch the graphml file using the select element value and call loadNodes
document.getElementById("load").addEventListener("click", async function () {
  placeidx = Number(selectElem.value);
  place = places[placeidx];
	placepos = place[1];
  placename = place[0];

  try {
    const response = await fetch(placename);
    const data = await response.text();
    loadNodes(data);
  } catch (error) {
    console.error("Error loading graph file:", error);
  }
});


// Map the edges on clicking start button
function mapEdges() {
  for (const node in nodes) {
    for (const adj of nodes[node].adj) {
      var latLngs = [
        [nodes[node].lat, nodes[node].lon],
        [nodes[adj.target].lat, nodes[adj.target].lon],
      ];
      const edgeLayer = L.polyline(latLngs, {
        color: "grey",
        weight: 4,
        opacity: 1,
      }).addTo(map);
      drawnLayers.push(edgeLayer);
    }
  }
}

document.querySelector("#start").addEventListener("click", mapEdges);

//Priority queue that stores nodes with their current best edge or path weight and the edge parent
class PriorityQueue {
  constructor() {
    this.heap = [];
    this.indices = new Map();
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

  heapifyUp(i) {
    while (i > 0) {
      const parent = Math.floor((i - 1) / 2);
      if (this.heap[i].weight < this.heap[parent].weight) {
        this.swap(i, parent);
        i = parent;
      } else {
        break;
      }
    }
  }

  heapifyDown(i) {
    const n = this.heap.length;
    while (true) {
      let left = 2 * i + 1;
      let right = 2 * i + 2;
      let smallest = i;
      if (left < n && this.heap[left].weight < this.heap[smallest].weight) {
        smallest = left;
      }
      if (right < n && this.heap[right].weight < this.heap[smallest].weight) {
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

  enqueue(node, weight, parent = null) {
    if (this.indices.has(node)) {
      const index = this.indices.get(node);
      if (weight < this.heap[index].weight) {
        this.heap[index].weight = weight;
        this.heap[index].parent = parent;
        this.heapifyUp(index);
      }
    } else {
      const entry = { node, weight, parent };
      this.heap.push(entry);
      const index = this.heap.length - 1;
      this.indices.set(node, index);
      this.heapifyUp(index);
    }
  }

  dequeue() {
    if (this.isEmpty()) return null;
    const min = this.heap[0];
    const last = this.heap.pop();
    this.indices.delete(min.node);
    if (!this.isEmpty()) {
      this.heap[0] = last;
      this.indices.set(last.node, 0);
      this.heapifyDown(0);
    }
    return min;
  }
}


// Other helper functions and variables
const delay = 100;
let drawnLayers = [];

function clearDrawnPaths() {
  drawnLayers.forEach((layer) => {
    map.removeLayer(layer);
  });
  drawnLayers = [];
}

document.querySelector("#clear").addEventListener("click", clearDrawnPaths);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
