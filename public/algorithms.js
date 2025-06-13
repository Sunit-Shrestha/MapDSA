// Dijkstra's algorithm using the PriorityQueue class
async function dijkstra() {
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

	// Mark the source and destination
  const sourceMarker = L.circleMarker(
    [nodes[sourceId].lat, nodes[sourceId].lon],
    {
      color: "green",
      radius: 5,
      fillColor: "green",
      fillOpacity: 1,
    }
  ).addTo(map);
	const targetMarker = L.circleMarker(
		[nodes[targetId].lat, nodes[targetId].lon],
		{
			color: "black",
			radius: 5,
			fillColor: "black",
			fillOpacity: 1,
		}
	).addTo(map);
	drawnLayers.push(sourceMarker);
	drawnLayers.push(targetMarker);

	// Initialize distances and previous nodes to Inifinity and null except for source
  const distances = {};
  const prev = {};
  for (const node in nodes) {
    distances[node] = Infinity;
    prev[node] = null;
  }
  distances[sourceId] = 0;

	// Initialize priority queue
  const pq = new PriorityQueue();
  for (const node in nodes) {
    pq.enqueue(node, distances[node]);
  }

  const branchLayers = [];

	// Dijkstra's algorithm
  while (!pq.isEmpty()) {
    const { node: u } = pq.dequeue();

		// mark the dequeued node
    const currentMarker = L.circleMarker([nodes[u].lat, nodes[u].lon], {
      color: "green",
      radius: 5,
    }).addTo(map);

		// Stop if target found
    if (u === targetId) {
      await sleep(delay);
      map.removeLayer(currentMarker);
      break;
    }

		// Relax the edges
    for (const edge of nodes[u].adj) {
      const v = edge.target;
      const weight = parseFloat(edge.weight);
      const alt = distances[u] + weight;
      if (alt < distances[v]) {
        distances[v] = alt;
        prev[v] = u;
        pq.enqueue(v, alt);
        const branchLine = L.polyline(
          [
            [nodes[u].lat, nodes[u].lon],
            [nodes[v].lat, nodes[v].lon],
          ],
          { color: "blue", weight: 2, opacity: 0.7 }
        ).addTo(map);
        branchLayers.push(branchLine);
      }
    }

    await sleep(delay);
    map.removeLayer(currentMarker);
  }

	// Construct the shortest path
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

	// Remove the branch lines
  branchLayers.forEach((layer) => map.removeLayer(layer));

  // Draw the parent tree
  for (const node in nodes) {
    if (prev[node] !== null) {
      const parentEdge = L.polyline(
        [
          [nodes[node].lat, nodes[node].lon],
          [nodes[prev[node]].lat, nodes[prev[node]].lon],
        ],
        { color: "blue", weight: 2, opacity: 1 }
      ).addTo(map);
      drawnLayers.push(parentEdge);
    }
  }

  // Draw the final shortest path
  const latLngs = path.map((nodeId) => [nodes[nodeId].lat, nodes[nodeId].lon]);
  const finalPath = L.polyline(latLngs, {
    color: "yellow",
    weight: 4,
    opacity: 1,
  }).addTo(map);
  drawnLayers.push(finalPath);

  alert("Shortest path distance: " + distances[targetId]);
}

document.querySelector("#dijkstra").addEventListener("click", dijkstra);

// Prim's MST algorithm
async function minimumSpanningTree() {
  const nodeIds = Object.keys(nodes);
  if (nodeIds.length === 0) {
    alert("No nodes available!");
    return;
  }
  
  // Pick an arbitrary start node
  const startId = nodeIds[0];
  const inMST = new Set();

  // Initialize the priority queue (storing nodes with their current best edge weight)
  const pq = new PriorityQueue();
  
  // Set start node weight to 0; all others to Infinity.
  for (const node of nodeIds) {
    if (node === startId) {
      pq.enqueue(node, 0, null);
    } else {
      pq.enqueue(node, Infinity, null);
    }
  }
  
  while (!pq.isEmpty()) {
    const current = pq.dequeue();
    const currentNode = current.node;
    inMST.add(currentNode);
    
    // If current node is not the starting node, draw the connecting edge (using its parent)
    if (current.parent !== null) {
      const polyline = L.polyline(
        [
          [nodes[current.parent].lat, nodes[current.parent].lon],
          [nodes[currentNode].lat, nodes[currentNode].lon]
        ],
        { color: "purple", weight: 4, opacity: 1 }
      ).addTo(map);
      drawnLayers.push(polyline);
      
      const marker = L.circleMarker(
        [nodes[currentNode].lat, nodes[currentNode].lon],
        { color: "blue", radius: 5 }
      ).addTo(map);
      await sleep(delay);
      map.removeLayer(marker);
    }
    
    // Update neighbors not yet in the MST.
    for (const edge of nodes[currentNode].adj) {
      const neighbor = edge.target;
      if (!inMST.has(neighbor)) {
        const weight = parseFloat(edge.weight);
        // If the connecting edge is lighter than the current best for the neighbor, update it.
        pq.enqueue(neighbor, weight, currentNode);
      }
    }
  }
  
  alert("Minimum spanning tree complete.");
}

document.querySelector("#mst").addEventListener("click", minimumSpanningTree);
