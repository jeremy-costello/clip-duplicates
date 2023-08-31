import React, { useState, useEffect } from 'react';

function Duplicates() { 
  const [threshold, setThreshold] = useState('1.00');
  const [searchString, setSearchString] = useState('');
  const [clusters, setClusters] = useState([]);
  const [currentClusterIndex, setCurrentClusterIndex] = useState(0);
  const [fileLocations, setFileLocations] = useState([]);
  const [showImages, setShowImages] = useState(false);
  const [prunedFileLocations, setPrunedFileLocations] = useState([]);
  const [prunedImageNames, setPrunedImageNames] = useState([]);
  const [prunedImageSizes, setPrunedImageSizes] = useState([]);
  const [prunedImageDimensions, setPrunedImageDimensions] = useState([]);
  const [prunedImageExtensions, setPrunedImageExtensions] = useState([]);
  const [prunedImageDates, setPrunedImageDates] = useState([]);
  const [prunedImageDeleteds, setPrunedImageDeleteds] = useState([]);
  const [prunedFullLocations, setPrunedFullLocations] = useState([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState(null);
  const [deletedImages, setDeletedImages] = useState([]);
  const [restoredImages, setRestoredImages] = useState([]);
  const [maxSizeIndices, setMaxSizeIndices] = useState([]);
  const [maxDimensionIndices, setMaxDimensionIndices] = useState([]);
  const [renameInputs, setRenameInputs] = useState([]);
  
  const portFlask = process.env.REACT_APP_PORT_FLASK_SERVER;
  const portNode = process.env.REACT_APP_PORT_NODE_SERVER;
  const dateRegex = /\b((?:\d{4}[\s_.-]?(?:\d{2}[\s_.-]?\d{2}|\d{2}[\s_.-]?\d{4}))|(?:\d{2}[\s_.-]?(?:(?<!\d)\d{2}(?!\d)[\s_.-]?\d{4}|\d{4}(?!\d)[\s_.-]?\d{2}(?!\d))))\b/;
  
  useEffect(() => {
    setRenameInputs(Array(prunedFullLocations.length).fill(''));
  }, [prunedFullLocations]);

  const handleThresholdChange = (event) => {
    const value = event.target.value;
    // Parse the input value as a float and set the threshold state
    setThreshold(parseFloat(value));
  };

  const handleSearchStringChange = (event) => {
    setSearchString(event.target.value);
  };

  const handleSearchClick = () => {
    const data = { threshold, search_string: searchString };

    fetch(`http://localhost:${portFlask}/api/duplicates/clusters`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    })
    .then(response => response.json())
    .then(data => {
      setClusters(data.clusters);
      setFileLocations(data.file_locations);
    })
    .catch(error => {
      console.error('Error:', error);
    });
  };

  const handlePruneClick = () => {
    const prunedLocations = clusters[0].map(item => fileLocations[item]);
    fetchData(prunedLocations);
  };

  const handleNextClick = () => {
    const nextIndex = currentClusterIndex + 1;
    if (nextIndex < clusters.length) {
      const prunedLocations = clusters[nextIndex].map(item => fileLocations[item]);
      setCurrentClusterIndex(nextIndex);
      fetchData(prunedLocations);
    }
	setDeletedImages([]);
	setRestoredImages([]);
	setSelectedImageIndex(null);
  };

  const handlePreviousClick = () => {
    const previousIndex = currentClusterIndex - 1;
    if (previousIndex >= 0) {
      const prunedLocations = clusters[previousIndex].map(item => fileLocations[item]);
      setCurrentClusterIndex(previousIndex);
      fetchData(prunedLocations);
    }
	setDeletedImages([]);
	setRestoredImages([]);
	setSelectedImageIndex(null);
  };

  const fetchData = async (prunedLocations) => {
    fetch(`http://localhost:${portFlask}/api/duplicates/pruning`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(prunedLocations)
    })
	.then(response => response.json())
	.then(data => {
	  // Set the received data into separate variables
	  setPrunedFileLocations(data.relative_locations);
	  setPrunedFullLocations(data.full_locations);
	  setPrunedImageNames(data.image_names);
	  setPrunedImageSizes(data.image_sizes);
	  setPrunedImageDimensions(data.image_dimensions);
	  setPrunedImageExtensions(data.image_extensions);
	  setPrunedImageDates(data.image_dates);
	  setPrunedImageDeleteds(data.image_deleteds);
	  setShowImages(true);
	  
	  setMaxSizeIndices(getMaxValueIndices(data.image_sizes));
	  const areaArray = data.image_dimensions.map(entry => {
		const [value1, value2] = entry.split('x');
		return Number(value1) * Number(value2);
	  });
	  setMaxDimensionIndices(getMaxValueIndices(areaArray));
	})
	.catch(error => {
		console.error('Error:', error);
	});
  };

  const handleImageClick = (index) => {
    setSelectedImageIndex(index);
  };

  const handleCloseClick = () => {
    setSelectedImageIndex(null);
  };

  const handleDeleteToggle = (index) => {
    if (deletedImages.includes(index)) {
      setDeletedImages(deletedImages.filter(item => item !== index));
    } else {
      setDeletedImages([...deletedImages, index]);
    }
  };

  const handleRestoreToggle = (index) => {
    if (restoredImages.includes(index)) {
      setRestoredImages(restoredImages.filter(item => item !== index));
    } else {
      setRestoredImages([...restoredImages, index]);
    }
  };

  const handleDeleteSelectedClick = () => {
    const selectedFileLocations = prunedFileLocations.filter((_, index) =>
      deletedImages.includes(index)
    );

    fetch(`http://localhost:${portFlask}/api/duplicates/delete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(selectedFileLocations),
    })
      .then((response) => response.json())
      .then((data) => {
        // Handle the response if needed
        const prunedLocations = clusters[currentClusterIndex].map(item => fileLocations[item]);
        fetchData(prunedLocations);
		setDeletedImages([]);
		setSelectedImageIndex(null);
      })
      .catch((error) => {
        console.error('Error:', error);
      });
  };
  
  const handlePermaDeleteClick = () => {
    const confirmation = window.confirm("Are you sure you wish to permanently delete all images marked for deletion?");
    if (confirmation) {
      handlePermaDeleteConfirm();
    }
  };
  
  const handlePermaDeleteConfirm = () => {
    fetch(`http://localhost:${portFlask}/api/duplicates/perma_delete`, {
      method: 'DELETE'
    })
      .then((response) => response.json())
      .then((data) => {
        // Handle the response if needed
        const prunedLocations = clusters[currentClusterIndex].map(item => fileLocations[item]);
        fetchData(prunedLocations);
        setDeletedImages([]);
        setSelectedImageIndex(null);
      })
      .catch((error) => {
        console.error('Error:', error);
      });
  };


  const handleRestoreSelectedClick = () => {
    const selectedFileLocations = prunedFileLocations.filter((_, index) =>
      restoredImages.includes(index)
    );

    fetch(`http://localhost:${portFlask}/api/duplicates/restore`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(selectedFileLocations),
    })
      .then((response) => response.json())
      .then((data) => {
        // Handle the response if needed
        const prunedLocations = clusters[currentClusterIndex].map(item => fileLocations[item]);
        fetchData(prunedLocations);
		setRestoredImages([]);
		setSelectedImageIndex(null);
      })
      .catch((error) => {
        console.error('Error:', error);
      });
  };
  
  const handleRenameInputChange = (e, index) => {
    const newRenameInputs = [...renameInputs];
    newRenameInputs[index] = e.target.value;
    setRenameInputs(newRenameInputs);
  };
  
  const handleRenameClick = (index) => {
	const oldRelativeLocation = prunedFileLocations[index];
	const newName = renameInputs[index];
	const oldName = prunedImageNames[index];
	
    // Make API call to /api/duplicates/rename with the renameInput value
    fetch(`http://localhost:${portFlask}/api/duplicates/rename`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
		new_name: newName,
		old_name: oldName,
		old_relative_location: oldRelativeLocation
	  })
    })
      .then(response => response.json())
      .then(data => {
		if (data.success) {
		  const fileIndex = fileLocations.indexOf(oldRelativeLocation);
		  const newRelativeLocation = oldRelativeLocation.replace(oldName, newName);
		  fileLocations[fileIndex] = newRelativeLocation;
		  renameInputs[index] = ''
		
		  const prunedLocations = clusters[currentClusterIndex].map(item => fileLocations[item]);
		  fetchData(prunedLocations);
		} else {
		  alert('File name already exists!');
		}
      })
      .catch(error => {
        console.error('Error:', error);
      });
  };
  
  const getMaxValueIndices = (array) => {
	const maxValue = Math.max(...array);
	const maxIndices = array.reduce((indices, value, index) => {
      if (value === maxValue) {
        indices.push(index);
      }
      return indices;
    }, [])
	return maxIndices;
  };

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4 text-center">Find Duplicates</h2>
      <div className="flex mb-4">
        <div className="mr-4">
          <label htmlFor="threshold" className="block font-bold mb-2">
            Threshold:
          </label>
          <input
            type="number"
            id="threshold"
            className="border border-gray-300 rounded px-2 py-1"
            value={threshold}
            onChange={handleThresholdChange}
            step="0.01" // Restrict input to two decimal places
          />
        </div>
        <div>
          <label htmlFor="searchString" className="block font-bold mb-2">
            Search String:
          </label>
          <input
            type="text"
            id="searchString"
            className="border border-gray-300 rounded px-2 py-1"
            value={searchString}
            onChange={handleSearchStringChange}
          />
        </div>
      </div>
      <button
        onClick={handleSearchClick}
        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
      >
        Search
      </button>

      {clusters.length > 0 && (
        <>
          <button
            onClick={handlePruneClick}
            className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded ml-4"
          >
            Prune
          </button>
          {showImages ? (
            <>
              <div className="flex space-x-4 mt-2">
                <button
                  onClick={handleDeleteSelectedClick}
				  className={`${deletedImages.length === 0 ? 'opacity-50 bg-red-500' : 'bg-red-500 hover:bg-red-700'} text-white font-bold py-2 px-4 rounded`}
				  disabled={deletedImages.length === 0}
                >
                  Delete Selected
                </button>
                <button
                  onClick={handleRestoreSelectedClick}
                  className={`${restoredImages.length === 0 ? 'opacity-50 bg-green-500' : 'bg-green-500 hover:bg-green-700'} text-white font-bold py-2 px-4 rounded`}
				  disabled={restoredImages.length === 0}
                >
                  Restore Selected
                </button>
              </div>
			  <div className="flex space-x-4 mt-2">
                <button
                  onClick={handlePreviousClick}
                  className={`${currentClusterIndex === 0 ? 'opacity-50 bg-blue-500' : 'bg-blue-500 hover:bg-blue-700'} text-white font-bold py-2 px-4 rounded`}
				  disabled={currentClusterIndex === 0}
                >
                  Previous Cluster
                </button>
                <button
                  onClick={handleNextClick}
                  className={`${currentClusterIndex === clusters.length - 1 ? 'opacity-50 bg-blue-500' : 'bg-blue-500 hover:bg-blue-700'} text-white font-bold py-2 px-4 rounded`}
				  disabled={currentClusterIndex === clusters.length - 1}
                >
                  Next Cluster
                </button>
			  </div>
			  <div>
			    <button
				  onClick={handlePermaDeleteClick}
				  className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
				>
				  Delete Permanently
				</button>
			  </div>
              {prunedFullLocations.length > 0 ? (
                <div className="flex flex-col mt-4">
                  <div className="flex">
                    {selectedImageIndex !== null && (
                      <div className="fixed z-10 top-0 right-0 p-4">
                        <button
                          onClick={handleCloseClick}
                          className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
                        >
                          X
                        </button>
                      </div>
                    )}
                    <div className="flex flex-col mt-4">
                      <div className="max-h-screen overflow-y-auto flex-grow">
                        <div className="grid grid-cols-1 gap-4">
                          {prunedFullLocations.map((location, index) => (
                            <div className="flex items-center" key={index}>
                              <img
                                src={`http://localhost:${portNode}/${location}`}
                                alt={`${index + 1}`}
                                className="w-48 h-auto m-2 cursor-pointer"
                                onClick={() => handleImageClick(index)}
                              />
                              <div>
                                <h3 className="font-bold text-lg">Image {index + 1}</h3>
                                <div>
                                  <div className="">
								    {prunedImageNames[index]}
								  </div>
								  <div className="flex items-center">
								    <input
									  key={`${index}-text`}
									  type="text"
									  value={renameInputs[index]}
									  onChange={(e) => handleRenameInputChange(e, index)}
									  className="mr-2 p-2 border border-gray-300 rounded"
								    />
								    <button
									  key={`${index}-button`}
									  onClick={() => handleRenameClick(index)}
									  className={`${!renameInputs[index] ? 'opacity-50 bg-blue-500' : 'bg-blue-500 hover:bg-blue-700'} text-white font-bold py-2 px-4 rounded`}
									  disabled={!renameInputs[index]}
								    >
									  Rename
								    </button>
								  </div>
								  <div className="">
								    {prunedImageNames[index].match(dateRegex) && (
									  <span>
									    {' '}
									    Regex Date: {prunedImageNames[index].match(dateRegex)[0]}
									  </span>
								    )}
								  </div>
								  <div className={`${maxSizeIndices.includes(index) ? 'font-bold text-green-600' : 'text-red-600'}`}>
                                    Size: {prunedImageSizes[index]} bytes
                                  </div>
								  <div className={`${maxDimensionIndices.includes(index) ? 'font-bold text-green-600' : ' text-red-600'}`}>
                                    Dimensions: {prunedImageDimensions[index]}
                                  </div>
								  <div className="">
                                    Extension: {prunedImageExtensions[index]}
                                  </div>
								  <div className="">
								    Metadata Date: {new Date(prunedImageDates[index]).toLocaleDateString('en-US', {
									  year: 'numeric',
									  month: 'long',
									  day: 'numeric'
								    })}
								  </div>
								  <div className="">
                                    Deleted: {prunedImageDeleteds[index] ? (
                                      <span className="">True</span>
                                    ) : (
                                      <span className="">False</span>
                                  )}
								  </div>
                                </div>
                                <div className="mt-2">
                                  <label className="flex items-center">
                                    <input
                                      type="checkbox"
                                      className="form-checkbox"
                                      checked={restoredImages.includes(index)}
                                      onChange={() => handleRestoreToggle(index)}
									  disabled={!prunedImageDeleteds[index]}
                                    />
                                    <span className={`${prunedImageDeleteds[index] ? 'text-green-600 font-bold' : 'opacity-50 text-gray-300'} ml-2`}>RESTORE</span>
                                  </label>
                                  <label className="flex items-center">
                                    <input
                                      type="checkbox"
                                      className="form-checkbox"
                                      checked={deletedImages.includes(index)}
                                      onChange={() => handleDeleteToggle(index)}
									  disabled={prunedImageDeleteds[index]}
                                    />
                                    <span className={`${!prunedImageDeleteds[index] ? 'text-red-600 font-bold' : 'opacity-50 text-gray-300'} ml-2`}>DELETE</span>
                                  </label>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
					{selectedImageIndex !== null && (
                      <div className="object-contain w-screen h-screen flex flex-col items-center justify-center">
                        <img
                          src={`http://localhost:${portNode}/${prunedFullLocations[selectedImageIndex]}`}
                          alt={`Selected`}
                          className="object-contain h-[90%]"
                        />
                        <div className="mt-2">
                          <h3 className="font-bold text-center">
                            Image {selectedImageIndex + 1}
                          </h3>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <p>No images to display.</p>
              )}
            </>
          ) : (
            <p>Click the "Prune" button to view pruned images.</p>
          )}
        </>
      )}
    </div>
  );
}

export default Duplicates;
