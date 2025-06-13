# 🗺️ Map Visualizer

A web application for visualizing and exploring city road networks using [Leaflet.js](https://leafletjs.com/) and [GraphML](https://graphml.graphdrawing.org/). Users can load different city maps, view nodes and edges, and run graph algorithms like Dijkstra's and Prim's.

## ✨ Features

- 🗺️ Interactive map display with [Leaflet.js](https://leafletjs.com/)
- 📂 Load and visualize road networks from GraphML files
- 🌎 Select between multiple cities (Salt Lake City, Charleston, Kathmandu)
- 📍 Display nodes as clickable markers (copy node ID, set as start/end)
- 🛣️ Show all edges on the map
- 🏁 Run Dijkstra's shortest path and Prim's minimum spanning tree algorithms
- 🧹 Clear map overlays and reset selections

## 📁 Project Structure

```
.
├── app.js                # Express server setup
├── index.html            # Main HTML file
├── package.json          # Project metadata and dependencies
├── public/
│   ├── algorithms.js     # Graph algorithms (Dijkstra, Prim, etc.)
│   ├── charleston.graphml
│   ├── kathmandu.graphml
│   ├── salt.graphml
│   ├── vat.graphml
│   ├── index.js          # Main client-side JS logic
│   └── styles.css        # Custom styles
└── README.md             # Project documentation
```

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v14+ recommended)
- [npm](https://www.npmjs.com/)

### Installation

1. Clone the repository:
    ```sh
    git clone <your-repo-url>
    cd maps
    ```

2. Install dependencies:
    ```sh
    npm install
    ```

### Running the Application

Start the server:
```sh
node app.js
```

Open your browser and navigate to [http://localhost:3000](http://localhost:3000).

## 🕹️ Usage

- 🌍 Select a city from the dropdown and click **Load Map**.
- 📍 Click on nodes to copy their ID and set as start/end for algorithms.
- 🛣️ Use **Show Edges** to display all edges.
- 🏁 Use **Dijkstra** or **Prim** to run the respective algorithms.
- 🧹 Use **Clear** to remove overlays and reset selections.

## 📄 File Descriptions

- [`public/index.js`](public/index.js): Handles map initialization, node/edge loading, and UI interactions.
- [`public/algorithms.js`](public/algorithms.js): Implements graph algorithms (Dijkstra, Prim).
- [`app.js`](app.js): Express server for serving static files and the main HTML page.
- [`index.html`](index.html): Main web page structure and controls.
- GraphML files: City road network data.

## 🪪 License

MIT License

---

**Credits:**  
- [Leaflet.js](https://leafletjs.com/) for interactive maps  
- [OpenStreetMap](https://www.openstreetmap.org/) for map tiles
