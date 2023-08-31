import 'tailwindcss/tailwind.css';
import React, { useState } from 'react';
import { Route, Routes, Link } from 'react-router-dom';
import Home from './Home';
import Gallery from './Gallery';
import EncodeImages from './EncodeImages';
import Duplicates from './Duplicates';
import TextSearch from './TextSearch';

function App() {
  const [isSliderOpen, setIsSliderOpen] = useState(false);

  const toggleSlider = () => {
    setIsSliderOpen(!isSliderOpen);
  };

  return (
    <div className={`flex ${isSliderOpen ? 'overflow-hidden' : ''}`}>
      {/* Slider */}
      <div
        className={`fixed left-0 top-0 bg-gray-900 h-full w-48 transition-transform duration-300 transform ${
          isSliderOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <nav className="flex flex-col items-center p-4">
		      <Link to="/" className="text-white py-2 px-4 mb-2 rounded hover:bg-gray-800">
            Home
          </Link>
          <Link to="/gallery" className="text-white py-2 px-4 mb-2 rounded hover:bg-gray-800">
            Gallery
          </Link>
          <Link to="/encode_images" className="text-white py-2 px-4 mb-2 rounded hover:bg-gray-800">
            Encode Images
          </Link>
		      <Link to="/duplicates" className="text-white py-2 px-4 mb-2 rounded hover:bg-gray-800">
            Duplicates
          </Link>
		      <Link to="/text_search" className="text-white py-2 px-4 mb-2 rounded hover:bg-gray-800">
            Text Search
          </Link>
        </nav>
        <button
          className="absolute bottom-0 left-0 w-full py-2 bg-gray-800 text-white font-bold hover:bg-gray-700"
          onClick={toggleSlider}
        >
          Close
        </button>
      </div>

      {/* Content */}
      <div className={`flex-1 ${isSliderOpen ? 'ml-48' : ''}`}>
        {!isSliderOpen && (
          <button
            className="fixed top-4 left-4 bg-gray-900 text-white p-2 rounded-lg z-20"
            onClick={toggleSlider}
          >
            Menu
          </button>
        )}

        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/gallery" element={<Gallery />} />
          <Route path="/encode_images" element={<EncodeImages />} />
		      <Route path="/duplicates" element={<Duplicates />} />
		      <Route path="/text_search" element={<TextSearch />} />
        </Routes>
      </div>
    </div>
  );
}

export default App;
