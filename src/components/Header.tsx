import React from "react";
import { Link } from "react-router-dom";

const Header = () => {
  return (
    <div
        className="flex gap-5 items-center h-16 bg-white text-black relative shadow-sm font-mono"
        role="navigation"
    >
      <Link
        className="text-2xl font-bold text-blue-800 hover:text-blue-500"
        to="/"
      >
        Auction
      </Link>
      <Link
        className="text-2xl font-bold text-blue-800 hover:text-blue-500"
        to="/upload"
      >
        Upload
      </Link>
    </div>
  );
};

export default Header;
