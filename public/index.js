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
	for (const node of nodeElements) {
		const nodeId = node.getAttribute("id");
		const lat = node.querySelector('data[key="d1"]').textContent;
		const lon = node.querySelector('data[key="d2"]').textContent;
		nodes[nodeId] = { lat: parseFloat(lat), lon: parseFloat(lon) , adj: []};
	}

	// Get all edges
	const edgeElements = xmlDoc.getElementsByTagName("edge");
	for (const edge of edgeElements) {
		const source = edge.getAttribute("source");
		const target = edge.getAttribute("target");
		const weight = edge.querySelector('data[key="d11"]').textContent;

		// Store edge data with source and target node ids and edge attributes
		nodes[source].adj.push({ target: target, weight: weight });
		nodes[target].adj.push({ target: source, weight: weight });
	}

	for (const node in nodes) {
		if (nodes[node].adj.length === 0) {
			delete nodes[node];
		}
	}

	for (const node in nodes) {
		const lat = nodes[node].lat;
		const lon = nodes[node].lon;
		L.circleMarker([lat, lon], {
			color: 'red',  // Color of the dot
			radius: 1     // Size of the dot (in pixels)
		}).addTo(map);
		// Store node with id as key and lat/lon as value
	}
}

fetch("asaltnew.graphml")
  .then((response) => response.text())
  .then(loadNodes);

function mapEdges() {
	for (const node in nodes) {
		for (const adj of nodes[node].adj) {
			var latLngs = [
				[nodes[node].lat, nodes[node].lon],
				[nodes[adj.target].lat, nodes[adj.target].lon],
			]
			L.polyline(latLngs, {
				color: "white", // Line color
				weight: 4, // Line width
				opacity: 1, // Line opacity
			}).addTo(map);
		}
	}
}

document.querySelector("#start").addEventListener("click", mapEdges);

// Helper function to pause execution for a given time (in ms)
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function dijkstra() {
  // Ask the user for the source and target node IDs.
	const ids = Object.keys(nodes);
  const sourceId = ids[0];
  const targetId = ids[ids.length - 1];
	L.circleMarker([nodes[sourceId].lat, nodes[sourceId].lon], {
		color: 'black',
		radius: 5
	}).addTo(map);
	L.circleMarker([nodes[targetId].lat, nodes[targetId].lon], {
		color: 'black',
		radius: 5
	}).addTo(map);

  if (!nodes[sourceId] || !nodes[targetId]) {
    alert("Invalid node id(s) provided!");
    return;
  }

  // Initialize distances and previous node record.
  const distances = {};
  const prev = {};
  for (const node in nodes) {
    distances[node] = Infinity;
    prev[node] = null;
  }
  distances[sourceId] = 0;

  // Array to keep track of branch lines (edges being relaxed) for animation.
  const branchLayers = [];

  // Create a list of all node ids (acting as a simple priority queue).
  let queue = Object.keys(nodes);

  while (queue.length > 0) {
    // Sort the queue by current known distances.
    queue.sort((a, b) => distances[a] - distances[b]);
    const u = queue.shift();

    // Animate current processing: add a green marker on node u.
    const currentMarker = L.circleMarker([nodes[u].lat, nodes[u].lon], {
      color: 'green',
      radius: 5
    }).addTo(map);

    // If the target node is reached, break out of the loop.
    if (u === targetId) {
      await sleep(100);
      map.removeLayer(currentMarker);
      break;
    }

    // Process all adjacent edges from node u.
    for (const edge of nodes[u].adj) {
      const v = edge.target;
      // Only consider nodes still in the queue.
      if (!queue.includes(v)) continue;
      
      // Ensure the weight is a number.
      const weight = parseFloat(edge.weight);
      const alt = distances[u] + weight;
      if (alt < distances[v]) {
        distances[v] = alt;
        prev[v] = u;

        // Animate the edge relaxation by drawing a yellow branch line.
        const branchLine = L.polyline(
          [
            [nodes[u].lat, nodes[u].lon],
            [nodes[v].lat, nodes[v].lon]
          ],
          {
            color: "blue",
            weight: 2,
            opacity: 0.7,
          }
        ).addTo(map);
        branchLayers.push(branchLine);
      }
    }

    // Wait a moment so the animation is visible, then remove the marker.
    await sleep(100);
    map.removeLayer(currentMarker);
  }

  // Reconstruct the shortest path by backtracking from the target.
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

  // Remove all branch lines (exploration paths) from the map.
  branchLayers.forEach(layer => {
    map.removeLayer(layer);
  });

  // Draw the final shortest path on the map as a blue polyline.
  const latLngs = path.map(nodeId => [nodes[nodeId].lat, nodes[nodeId].lon]);
  L.polyline(latLngs, {
    color: "blue",
    weight: 4,
    opacity: 1,
  }).addTo(map);

  alert("Shortest path distance: " + distances[targetId]);
}

// The event listener for the dijkstra button remains unchanged.
document.querySelector("#dijkstra").addEventListener("click", dijkstra);



document.querySelector("#dijkstra").addEventListener("click", dijkstra);

async function minimumSpanningTree() {
  const nodeIds = Object.keys(nodes);
  if (nodeIds.length === 0) {
    alert("No nodes available!");
    return;
  }

  // Start from an arbitrary node.
  const startId = nodeIds[0];
  const visited = new Set();
  visited.add(startId);

  // Array to store edges that become part of the MST.
  const mstEdges = [];
  const mstLayers = [];

  // Priority queue: array of candidate edges.
  const edgeQueue = [];

  // Add all edges from a given node to the queue.
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
    // Sort candidate edges by weight.
    edgeQueue.sort((a, b) => a.weight - b.weight);
    // Get the edge with the smallest weight.
    const edge = edgeQueue.shift();
    if (visited.has(edge.target)) {
      continue; // Skip if the target node is already visited.
    }
    
    // Add the edge to the MST.
    mstEdges.push(edge);
    visited.add(edge.target);
    addEdges(edge.target);

    // Animate the MST edge: draw a purple line.
    const polyline = L.polyline(
      [
        [nodes[edge.source].lat, nodes[edge.source].lon],
        [nodes[edge.target].lat, nodes[edge.target].lon]
      ],
      {
        color: "purple",
        weight: 4,
        opacity: 1,
      }
    ).addTo(map);
    mstLayers.push(polyline);

    // Optional: animate the newly added node with a blue marker.
    const marker = L.circleMarker([nodes[edge.target].lat, nodes[edge.target].lon], {
      color: 'blue',
      radius: 5
    }).addTo(map);
    await sleep(100);
    map.removeLayer(marker);
  }

  alert("Minimum spanning tree complete.");
}

document.querySelector("#mst").addEventListener("click", minimumSpanningTree);
