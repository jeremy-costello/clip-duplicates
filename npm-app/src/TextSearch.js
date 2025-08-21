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
    fetch(`http://localhost:${portFlask}/api/duplicates/load_model`)
      .then(response => response.json())
      .then(() => setIsLoading(false))
      .catch(error => {
        console.error('Error:', error);
        setIsLoading(false);
      });

    return () => {
      fetch(`http://localhost:${portFlask}/api/duplicates/unload_model`)
        .then(response => response.json())
        .catch(error => console.error('Error:', error));
    };
  }, [portFlask]);

  const handleTextInputChange = (event) => setTextInput(event.target.value);
  const handleSearchStringChange = (event) => setSearchString(event.target.value);

  const handleSearchClick = async () => {
    try {
      const response = await fetch(`http://localhost:${portFlask}/api/duplicates/text_search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
    <div className="min-h-screen flex flex-col items-center justify-start p-6 bg-gray-50">
      {isLoading ? (
        <div className="flex justify-center items-center h-screen">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-gray-900"></div>
        </div>
      ) : (
        <div className="w-full max-w-4xl bg-white shadow-md rounded-lg p-6">
          <h2 className="text-3xl font-bold mb-6 text-center">Text Search</h2>

          <div className="mb-4">
            <label htmlFor="textInput" className="block font-bold mb-2">
              Text Input:
            </label>
            <input
              type="text"
              id="textInput"
              className="w-full border border-gray-300 rounded px-3 py-2"
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
              className="w-full border border-gray-300 rounded px-3 py-2"
              value={searchString}
              onChange={handleSearchStringChange}
            />
          </div>

          <div className="flex justify-center mb-6">
            <button
              onClick={handleSearchClick}
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded"
            >
              Text Search
            </button>
          </div>

          {scores.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {scores.map(([index, score]) => (
                <div key={index} className="flex flex-col items-center border rounded p-4 shadow-sm">
                  <img
                    src={`http://localhost:${portNode}/${rootDirectory}/${fileLocations[index]}`}
                    alt={`Image ${index}`}
                    className="w-full h-auto object-contain mb-3 rounded"
                  />
                  <div className="text-center">
                    <h3 className="font-bold text-lg mb-1">Image {index}</h3>
                    <p>
                      Score: {score} <br />
                      File: {fileLocations[index]}
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
