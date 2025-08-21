import React, { useState, useEffect } from 'react';

function Duplicates() {
  const [settings, setSettings] = useState({
    threshold: 1.0,
    searchString: ''
  });
  const [clusters, setClusters] = useState([]);
  const [currentClusterIndex, setCurrentClusterIndex] = useState(0);
  const [images, setImages] = useState({
    fileLocations: [],
    prunedFileLocations: [],
    prunedFullLocations: [],
    prunedImageNames: [],
    prunedImageSizes: [],
    prunedImageDimensions: [],
    prunedImageExtensions: [],
    prunedImageDates: [],
    prunedImageDeleteds: []
  });
  const [uiState, setUiState] = useState({
    showImages: false,
    selectedImageIndex: null,
    deletedImages: [],
    restoredImages: [],
    maxSizeIndices: [],
    maxDimensionIndices: [],
    renameInputs: []
  });

  const portFlask = process.env.REACT_APP_PORT_FLASK_SERVER;
  const portNode = process.env.REACT_APP_PORT_NODE_SERVER;

  const dateRegex = /\b((?:\d{4}[\s_.-]?(?:\d{2}[\s_.-]?\d{2}|\d{2}[\s_.-]?\d{4}))|(?:\d{2}[\s_.-]?(?:(?<!\d)\d{2}(?!\d)[\s_.-]?\d{4}|\d{4}(?!\d)[\s_.-]?\d{2}(?!\d))))\b/;

  useEffect(() => {
    setUiState(prev => ({ ...prev, renameInputs: Array(images.prunedFullLocations.length).fill('') }));
  }, [images.prunedFullLocations]);

  const handleSettingsChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSearchClick = () => {
    const data = { threshold: settings.threshold, search_string: settings.searchString };
    fetch(`http://localhost:${portFlask}/api/duplicates/clusters`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
      .then(res => res.json())
      .then(data => {
        setClusters(data.clusters);
        setImages(prev => ({ ...prev, fileLocations: data.file_locations }));
      })
      .catch(console.error);
  };

  const fetchPrunedData = async (prunedLocations) => {
    fetch(`http://localhost:${portFlask}/api/duplicates/pruning`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(prunedLocations)
    })
      .then(res => res.json())
      .then(data => {
        const areaArray = data.image_dimensions.map(d => {
          const [w, h] = d.split('x').map(Number);
          return w * h;
        });
        setImages({
          ...images,
          prunedFileLocations: data.relative_locations,
          prunedFullLocations: data.full_locations,
          prunedImageNames: data.image_names,
          prunedImageSizes: data.image_sizes,
          prunedImageDimensions: data.image_dimensions,
          prunedImageExtensions: data.image_extensions,
          prunedImageDates: data.image_dates,
          prunedImageDeleteds: data.image_deleteds
        });
        setUiState(prev => ({
          ...prev,
          showImages: true,
          maxSizeIndices: getMaxValueIndices(data.image_sizes),
          maxDimensionIndices: getMaxValueIndices(areaArray)
        }));
      })
      .catch(console.error);
  };

  const handleClusterNavigation = (direction) => {
    const newIndex = currentClusterIndex + direction;
    if (newIndex >= 0 && newIndex < clusters.length) {
      const prunedLocations = clusters[newIndex].map(i => images.fileLocations[i]);
      setCurrentClusterIndex(newIndex);
      fetchPrunedData(prunedLocations);
      setUiState(prev => ({
        ...prev,
        deletedImages: [],
        restoredImages: [],
        selectedImageIndex: null
      }));
    }
  };

  const handleToggle = (type, index) => {
    const list = uiState[type];
    const newList = list.includes(index) ? list.filter(i => i !== index) : [...list, index];
    setUiState(prev => ({ ...prev, [type]: newList }));
  };

  const handleDeleteOrRestore = (action) => {
    const indices = action === 'deletedImages' ? uiState.deletedImages : uiState.restoredImages;
    if (!indices.length) return;
    const selectedFiles = images.prunedFileLocations.filter((_, i) => indices.includes(i));
    const endpoint = action === 'deletedImages' ? '/delete' : '/restore';

    fetch(`http://localhost:${portFlask}/api/duplicates${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(selectedFiles)
    })
      .then(res => res.json())
      .then(() => {
        const prunedLocations = clusters[currentClusterIndex].map(i => images.fileLocations[i]);
        fetchPrunedData(prunedLocations);
        setUiState(prev => ({ ...prev, [action]: [], selectedImageIndex: null }));
      })
      .catch(console.error);
  };

  const handlePermaDeleteClick = () => {
    if (window.confirm('Are you sure you wish to permanently delete all images marked for deletion?')) {
      fetch(`http://localhost:${portFlask}/api/duplicates/perma_delete`, { method: 'DELETE' })
        .then(res => res.json())
        .then(() => {
          const prunedLocations = clusters[currentClusterIndex].map(i => images.fileLocations[i]);
          fetchPrunedData(prunedLocations);
          setUiState(prev => ({ ...prev, deletedImages: [], selectedImageIndex: null }));
        })
        .catch(console.error);
    }
  };

  const handleRenameClick = (index) => {
    const oldName = images.prunedImageNames[index];
    const newName = uiState.renameInputs[index];
    const oldRelativeLocation = images.prunedFileLocations[index];

    fetch(`http://localhost:${portFlask}/api/duplicates/rename`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ new_name: newName, old_name: oldName, old_relative_location: oldRelativeLocation })
    })
      .then(res => res.json())
      .then(data => {
        if (!data.success) return alert('File name already exists!');
        const fileIndex = images.fileLocations.indexOf(oldRelativeLocation);
        const newRelativeLocation = oldRelativeLocation.replace(oldName, newName);
        images.fileLocations[fileIndex] = newRelativeLocation;
        uiState.renameInputs[index] = '';
        const prunedLocations = clusters[currentClusterIndex].map(i => images.fileLocations[i]);
        fetchPrunedData(prunedLocations);
      })
      .catch(console.error);
  };

  const getMaxValueIndices = (array) => {
    const max = Math.max(...array);
    return array.reduce((acc, val, idx) => (val === max ? [...acc, idx] : acc), []);
  };

  return (
    <div className="p-4 flex flex-col items-center">
      <h2 className="text-2xl font-bold mb-6 text-center">Find Duplicates</h2>

      <div className="flex flex-col md:flex-row md:space-x-6 mb-4 w-full justify-center">
        <div className="mb-4 md:mb-0">
          <label className="block font-bold mb-2">Threshold:</label>
          <input
            type="number"
            className="border border-gray-300 rounded px-2 py-1"
            value={settings.threshold}
            onChange={e => handleSettingsChange('threshold', parseFloat(e.target.value))}
            step="0.01"
          />
        </div>
        <div>
          <label className="block font-bold mb-2">Search String:</label>
          <input
            type="text"
            className="border border-gray-300 rounded px-2 py-1"
            value={settings.searchString}
            onChange={e => handleSettingsChange('searchString', e.target.value)}
          />
        </div>
      </div>

      <div className="flex space-x-4 mb-4">
        <button onClick={handleSearchClick} className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
          Search
        </button>
        {clusters.length > 0 && (
          <button onClick={() => fetchPrunedData(clusters[0].map(i => images.fileLocations[i]))} className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded">
            Prune
          </button>
        )}
      </div>

      {uiState.showImages && (
        <div className="w-full max-w-5xl">
          <div className="flex justify-between mb-4">
            <button
              onClick={() => handleClusterNavigation(-1)}
              disabled={currentClusterIndex === 0}
              className="bg-gray-300 hover:bg-gray-400 text-black font-bold py-2 px-4 rounded disabled:opacity-50"
            >
              Previous Cluster
            </button>
            <span>Cluster {currentClusterIndex + 1} / {clusters.length}</span>
            <button
              onClick={() => handleClusterNavigation(1)}
              disabled={currentClusterIndex === clusters.length - 1}
              className="bg-gray-300 hover:bg-gray-400 text-black font-bold py-2 px-4 rounded disabled:opacity-50"
            >
              Next Cluster
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {images.prunedFileLocations.map((file, idx) => (
              <div key={idx} className="border rounded p-2 flex flex-col items-center">
                <img src={`http://localhost:${portNode}/images/${file}`} alt={images.prunedImageNames[idx]} className="mb-2 w-40 h-40 object-cover" />
                <span className="text-sm font-bold">{images.prunedImageNames[idx]}</span>
                <span className="text-xs">{images.prunedImageDimensions[idx]} | {images.prunedImageSizes[idx]} bytes</span>
                <div className="flex space-x-2 mt-2">
                  <button
                    onClick={() => handleToggle('deletedImages', idx)}
                    className={`px-2 py-1 text-white rounded ${uiState.deletedImages.includes(idx) ? 'bg-red-600' : 'bg-gray-500'}`}
                  >
                    Delete
                  </button>
                  <button
                    onClick={() => handleToggle('restoredImages', idx)}
                    className={`px-2 py-1 text-white rounded ${uiState.restoredImages.includes(idx) ? 'bg-green-600' : 'bg-gray-500'}`}
                  >
                    Restore
                  </button>
                </div>
                <div className="mt-2 flex space-x-2">
                  <input
                    type="text"
                    placeholder="New name"
                    className="border border-gray-300 rounded px-1 py-1 text-xs"
                    value={uiState.renameInputs[idx] || ''}
                    onChange={e => {
                      const newInputs = [...uiState.renameInputs];
                      newInputs[idx] = e.target.value;
                      setUiState(prev => ({ ...prev, renameInputs: newInputs }));
                    }}
                  />
                  <button
                    onClick={() => handleRenameClick(idx)}
                    className="bg-yellow-500 hover:bg-yellow-700 text-white px-2 py-1 rounded text-xs"
                  >
                    Rename
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex space-x-4 justify-center">
            <button onClick={() => handleDeleteOrRestore('deletedImages')} className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded">
              Delete Selected
            </button>
            <button onClick={() => handleDeleteOrRestore('restoredImages')} className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded">
              Restore Selected
            </button>
            <button onClick={handlePermaDeleteClick} className="bg-black hover:bg-gray-800 text-white font-bold py-2 px-4 rounded">
              Permanently Delete All
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Duplicates;
