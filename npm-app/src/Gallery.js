import React, { useState, useEffect, useCallback } from 'react';
import { Carousel } from 'react-responsive-carousel';
import 'react-responsive-carousel/lib/styles/carousel.min.css';

const Gallery = () => {
  const [currentFolder, setCurrentFolder] = useState('images');
  const [folderContent, setFolderContent] = useState([]);
  const [carouselImages, setCarouselImages] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);
  const [filterText, setFilterText] = useState('');
  const [selectedImageIndex, setSelectedImageIndex] = useState(0); // Track selected image index
  
  const portNode = process.env.REACT_APP_PORT_NODE_SERVER;
  console.log(portNode);

  const fetchFolderContent = useCallback(async (folder) => {
    try {
      const response = await fetch(`http://localhost:${portNode}/api/folder?path=${encodeURIComponent(folder)}`);
      const data = await response.json();
      const images = data.filter(item => /\.(jpg|png)$/.test(item.name.toLowerCase()));
      setCarouselImages(images);
      setFolderContent(data.filter(item => item.type !== 'file').sort((a, b) => a.name.localeCompare(b.name))); // Sort by image name
      setSelectedImage(null); // Reset selected image when folder changes
      setSelectedImageIndex(0); // Reset selected image index when folder changes
      setCurrentFolder(folder);
    } catch (error) {
      console.error('Error fetching folder content:', error);
    }
  }, [portNode]);

  const navigateToParentFolder = () => {
    const parentFolder = currentFolder.split('/').slice(0, -1).join('/');
    fetchFolderContent(parentFolder);
  };

  useEffect(() => {
    fetchFolderContent(currentFolder);
  }, [currentFolder, fetchFolderContent]);

  useEffect(() => {
    // Filter the carousel images based on filterText
    const filteredImages = carouselImages.filter(image =>
      image.name.toLowerCase().startsWith(filterText.toLowerCase())
    );
    setSelectedImageIndex(0); // Reset selected image index when filtering changes
    setSelectedImage(filteredImages.length > 0 ? filteredImages[0] : null);
  }, [carouselImages, filterText]);

  useEffect(() => {
    // Find the currently displayed image in the carousel
    const currentCarouselImage = carouselImages[selectedImageIndex];

    // Set the selected image
    setSelectedImage(currentCarouselImage);
  }, [selectedImageIndex, carouselImages]);
  
  useEffect(() => {
    // Find the index of the image matching the search text
    const matchingIndex = carouselImages.findIndex(
      image => image.name.toLowerCase().startsWith(filterText.toLowerCase())
    );
    
    // Update the selected image index
    if (matchingIndex !== -1) {
      setSelectedImageIndex(matchingIndex);
    }
  }, [filterText, carouselImages]);

  return (
    <div className="bg-gray-100 min-h-screen py-8">
      <div className="max-w-2xl mx-auto px-4">
        <h1 className="text-3xl font-semibold mb-4">Folder Browser</h1>
        <p className="mb-2">
          Current Folder: {currentFolder}
          {currentFolder !== 'images' && (
            <button
              className="ml-2 text-blue-500 hover:underline"
              onClick={navigateToParentFolder}
            >
              [Up a Level]
            </button>
          )}
        </p>
        <ul className="bg-white rounded shadow p-4">
          {currentFolder !== 'images' && (
            <li key="parent" className="py-1">
              <button
                className="text-blue-500 hover:underline"
                onClick={navigateToParentFolder}
              >
                [..]
              </button>
            </li>
          )}
          {folderContent.map(item => (
            <li key={item.name} className="py-1">
              <button
                className="text-blue-500 hover:underline"
                onClick={() => fetchFolderContent(`${currentFolder}/${item.name}`)}
              >
                [Folder] {item.name}
              </button>
            </li>
          ))}
        </ul>
        <div className="mt-4">
          <h2 className="text-xl font-semibold mb-2">Image Carousel</h2>
          <div className="mb-4">
            <label htmlFor="imageFilter" className="block font-medium mb-1">
              Search Images:
            </label>
            <input
              type="text"
              id="imageFilter"
              className="w-full px-3 py-2 border rounded"
              placeholder="Start typing to filter images..."
              value={filterText}
              onChange={e => setFilterText(e.target.value)}
            />
          </div>
          <div className="max-w-screen-lg mx-auto bg-blue-200">
            <Carousel
              selectedItem={selectedImageIndex}
              onChange={index => setSelectedImageIndex(index)}
			        showArrows={true}
			        showStatus={true}
			        showThumbs={true}
			        infiniteLoop={true}
			        useKeyboardArrows={true}
            >
              {carouselImages.map(image => (
                <div key={image.name}>
                  <img
                    src={`http://localhost:${portNode}/${currentFolder}/${image.name}`}
                    alt={image.name}
                    className="max-h-[50vh] object-contain w-full"
                  />
                </div>
              ))}
            </Carousel>
          </div>
          {selectedImage && (
            <p className="mt-2 text-center font-medium">
              Selected Image: {selectedImage.name}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Gallery;
