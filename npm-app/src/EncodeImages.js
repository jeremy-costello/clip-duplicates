import React, { useState } from 'react';

const App = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [showPopup, setShowPopup] = useState(false);

  const portFlask = process.env.REACT_APP_PORT_FLASK_SERVER;

  const handleButtonClick = () => {
    setIsLoading(true);
  
    fetch(`http://localhost:${portFlask}/api/duplicates/encode`)
      .then(response => response.json())
      .then(data => {
        setIsLoading(false);
  
        if (data.success) {
          setShowPopup({ success: true });
        } else {
          setShowPopup({ success: false, errorMessage: data.message });
        }
      })
      .catch(error => {
        setIsLoading(false);
        console.error('Error:', error);
      });
  };  

  const handleClosePopup = () => {
    setShowPopup(false);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <button
        className="bg-blue-500 text-white px-4 py-2 rounded shadow hover:bg-blue-600"
        onClick={handleButtonClick}
      >
        Encode Images
      </button>
      {isLoading && (
        <div className="mt-4">
          <div className="w-16 h-16 border-t-4 border-blue-500 border-solid animate-spin" />
        </div>
      )}
      {showPopup && (
        <div className="mt-4 bg-white p-4 rounded shadow relative">
          <button
            className="absolute top-0 right-0 text-gray-600 hover:text-gray-800"
            onClick={handleClosePopup}
          >
            X
          </button>
          {showPopup.success ? (
            <p>Images Encoded!</p>
          ) : (
            <p>{showPopup.errorMessage}</p>
          )}
        </div>
      )}
    </div>
  );
};

export default App;
