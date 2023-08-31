import React, { useState, useEffect } from 'react';

const TextSearch = () => {
  const [textInput, setTextInput] = useState('');
  const [searchString, setSearchString] = useState('');
  const [scores, setScores] = useState([]);
  const [fileLocations, setFileLocations] = useState([]);
  const [rootDirectory, setRootDirectory] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  
  const portFlask = process.env.REACT_APP_PORT_FLASK_SERVER;
  const portNode = process.env.REACT_APP_PORT_NODE_SERVER;

  useEffect(() => {
    // Load the model when the component mounts
    fetch(`http://localhost:${portFlask}/api/duplicates/load_model`)
      .then(response => response.json())
      .then(data => {
        // Model loaded successfully
        setIsLoading(false);
      })
      .catch(error => {
        console.error('Error:', error);
        setIsLoading(false);
      });

    // Cleanup function to unload the model when the component unmounts
    return () => {
      fetch(`http://localhost:${portFlask}/api/duplicates/unload_model`)
        .then(response => response.json())
        .catch(error => {
          console.error('Error:', error);
        });
    };
  }, [portFlask]);

  const handleTextInputChange = (event) => {
    setTextInput(event.target.value);
  };

  const handleSearchStringChange = (event) => {
    setSearchString(event.target.value);
  };

  const handleSearchClick = async () => {
    try {
      const response = await fetch(`http://localhost:${portFlask}/api/duplicates/text_search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text_input: textInput, search_string: searchString }),
      });

      if (response.ok) {
        const data = await response.json();
        setScores(data.sorted_scores);
        setFileLocations(data.file_locations);
		    setRootDirectory(data.root_directory);
      } else {
        console.error('Error:', response.status);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  return (
    <div className="p-4">
      {isLoading ? (
        // Display a loading spinner while waiting for the model to load
        <div className="w-full md:w-1/2 max-w-2xl flex justify-center items-center h-screen">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-gray-900"></div>
        </div>
      ) : (
		<div className="p-4">
		  <h2 className="text-2xl font-bold mb-4 text-center">Text Search</h2>
		  <div className="mb-4">
			<label htmlFor="textInput" className="block font-bold mb-2">
			  Text Input:
			</label>
			<input
			  type="text"
			  id="textInput"
			  className="border border-gray-300 rounded px-2 py-1"
			  value={textInput}
			  onChange={handleTextInputChange}
			/>
		  </div>
		  <div className="mb-4">
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
		  <button
			onClick={handleSearchClick}
			className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
		  >
			Text Search
		  </button>

		  {scores.length > 0 && (
			<div className="mt-4">
			  {scores.map(([index, score]) => (
				<div key={index} className="flex items-center mt-2">
				  <img
					src={`http://localhost:${portNode}/${rootDirectory}/${fileLocations[index]}`}
					alt={`${index}`}
					className="w-48 h-auto m-2"
				  />
				  <div>
					<h3 className="font-bold text-lg">Image {index}</h3>
					<p>
					  Score: {score}
					  <br />
					  File Location: {fileLocations[index]}
					</p>
				  </div>
				</div>
			  ))}
			</div>
		  )}
		</div>
      )}
    </div>
  );
};

export default TextSearch;
