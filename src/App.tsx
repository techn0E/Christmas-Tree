import { Analytics } from "@vercel/analytics/react";
import VideoGenerator from "./components/VideoGenerator";
import Navbar from "./components/Navbar";
import Snowfall from "./components/Snowfall";
import "./App.css";

function App() {
  return (
    <div className="app">
      <Snowfall />
      <Navbar />
      <main className="app-main">
        <VideoGenerator />
      </main>


      <Analytics />
    </div>
  );
}

export default App;
