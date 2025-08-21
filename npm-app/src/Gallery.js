import React, { useState, useEffect, useCallback } from 'react';
import { Carousel } from 'react-responsive-carousel';
import 'react-responsive-carousel/lib/styles/carousel.min.css';

const Gallery = () => {
  const [currentFolder, setCurrentFolder] = useState('images');
  const [folderContent, setFolderContent] = useState([]);
  const [carouselImages, setCarouselImages] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);
  const [filterText, setFilterText] = useState('');
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  const portNode = process.env.REACT_APP_PORT_NODE_SERVER;

  const fetchFolderContent = useCallback(async (folder) => {
    try {
      const response = await fetch(`http://localhost:${portNode}/api/folder?path=${encodeURIComponent(folder)}`);
      const data = await response.json();
      const images = data.filter(item => /\.(jpg|png)$/.test(item.name.toLowerCase()));
      setCarouselImages(images);
      setFolderContent(data.filter(item => item.type !== 'file').sort((a, b) => a.name.localeCompare(b.name)));
      setSelectedImage(null);
      setSelectedImageIndex(0);
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
    const filteredImages = carouselImages.filter(image =>
      image.name.toLowerCase().startsWith(filterText.toLowerCase())
    );
    setSelectedImageIndex(0);
    setSelectedImage(filteredImages.length > 0 ? filteredImages[0] : null);
  }, [carouselImages, filterText]);

  useEffect(() => {
    const currentCarouselImage = carouselImages[selectedImageIndex];
    setSelectedImage(currentCarouselImage);
  }, [selectedImageIndex, carouselImages]);

  useEffect(() => {
    const matchingIndex = carouselImages.findIndex(
      image => image.name.toLowerCase().startsWith(filterText.toLowerCase())
    );
    if (matchingIndex !== -1) {
      setSelectedImageIndex(matchingIndex);
    }
  }, [filterText, carouselImages]);

  return (
    <div className="bg-gray-100 min-h-screen py-8">
      <div className="container mx-auto px-6">
        <h1 className="text-4xl font-bold mb-6 text-center">Folder Browser</h1>

        <div className="mb-6">
          <p className="text-lg mb-2">
            Current Folder: <span className="font-semibold">{currentFolder}</span>
            {currentFolder !== 'images' && (
              <button
                className="ml-3 text-blue-600 hover:underline"
                onClick={navigateToParentFolder}
              >
                [Up a Level]
              </button>
            )}
          </p>

          <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 bg-white p-4 rounded shadow">
            {currentFolder !== 'images' && (
              <li key="parent">
                <button
                  className="w-full text-left text-blue-600 hover:underline p-2 border rounded"
                  onClick={navigateToParentFolder}
                >
                  [..]
                </button>
              </li>
            )}
            {folderContent.map(item => (
              <li key={item.name}>
                <button
                  className="w-full text-left text-blue-600 hover:underline p-2 border rounded"
                  onClick={() => fetchFolderContent(`${currentFolder}/${item.name}`)}
                >
                  [Folder] {item.name}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="mb-6">
          <h2 className="text-2xl font-semibold mb-3 text-center">Image Carousel</h2>

          <div className="mb-4 max-w-full mx-auto">
            <input
              type="text"
              className="w-full px-4 py-2 border rounded shadow"
              placeholder="Start typing to filter images..."
              value={filterText}
              onChange={e => setFilterText(e.target.value)}
            />
          </div>

          <div className="max-w-6xl mx-auto bg-blue-200 p-4 rounded shadow">
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
                <div key={image.name} className="flex justify-center">
                  <img
                    src={`http://localhost:${portNode}/${currentFolder}/${image.name}`}
                    alt={image.name}
                    className="max-h-[60vh] object-contain w-full"
                  />
                </div>
              ))}
            </Carousel>
          </div>

          {selectedImage && (
            <p className="mt-3 text-center font-medium">
              Selected Image: <span className="font-semibold">{selectedImage.name}</span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Gallery;
