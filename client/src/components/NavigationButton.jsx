import React from 'react';

const NavigationButton = ({ coordinates }) => {
  const openMaps = () => {
    if (!coordinates || !coordinates.lat || !coordinates.lng) {
      alert("Location coordinates not available for this order.");
      return;
    }

    // This URL format works on both Android and iOS to trigger the native Maps app
    const url = `https://www.google.com/maps/dir/?api=1&destination=${coordinates.lat},${coordinates.lng}&travelmode=driving`;
    window.open(url, '_blank');
  };

  return (
    <button 
      onClick={openMaps}
      className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition"
    >
      Navigate with Google Maps
    </button>
  );
};

export default NavigationButton;
