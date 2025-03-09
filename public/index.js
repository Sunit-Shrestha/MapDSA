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


class PriorityQueue {
	constructor() {
			this.items = [];
	}

	enqueue(element, priority) {
			const queueElement = { element, priority };
			let added = false;

			for (let i = 0; i < this.items.length; i++) {
					if (this.items[i].priority > priority) {
							this.items.splice(i, 0, queueElement);
							added = true;
							break;
					}
			}

			if (!added) {
					this.items.push(queueElement);
			}
	}

	dequeue() {
			return this.items.shift().element;
	}

	isEmpty() {
			return this.items.length === 0;
	}
}

function dijkstra() {
	var start = Object.keys(nodes)[0];
	console.log(nodes[start]);
	// Step 1: Set up distances, predecessors, and the priority queue
	let distances = {};  // Holds the shortest distance from the start node
	let predecessors = {};  // Holds the path to the nodes
	let pq = new PriorityQueue();  // Priority Queue for processing the nodes

	// Step 2: Initialize all distances to infinity, except for the start node
	for (let node in nodes) {
			distances[node] = Infinity;
			predecessors[node] = null;
	}
	distances[start] = 0;
	pq.enqueue(start, 0);  // Enqueue the start node with a distance of 0

	// Step 3: While there are still nodes to process
	while (!pq.isEmpty()) {
			let u = pq.dequeue();  // Get the node with the smallest distance

			// Step 4: For each neighbor of u
			for (let neighbor of nodes[u].adj) {
					let v = neighbor.target;
					let weight = neighbor.weight;

					// Calculate the tentative distance to v via u
					let alt = distances[u] + weight;

					// Step 5: If a shorter path to v is found
					if (alt < distances[v]) {
							distances[v] = alt;  // Update the shortest distance
							predecessors[v] = u;  // Update the predecessor
							pq.enqueue(v, distances[v]);  // Enqueue the updated distance
					}
			}
	}

	// Step 6: Return the result
	console.log(distances, predecessors);
}

document.querySelector("#dijkstra").addEventListener("click", dijkstra);