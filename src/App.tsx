import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Auction from "./pages/Auction";
import Upload from "./pages/Upload";
import Layout from "./components/Layout";

// const

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
      <Route element={<Layout />}>
        <Route index element={<Upload />} />
        {/* <Route path="/upload" element={} /> */}
      </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default App;
