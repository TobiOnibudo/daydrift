import { Route, Routes } from 'react-router-dom';

// Route-level screens are stubs for now. Real screens live in src/routes/
// (see docs/05-frontend.md §6 folder structure).

function HomeRoute() {
  return <h1>Daydrift</h1>;
}

function TripRoute() {
  return <h1>Trip</h1>;
}

export function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeRoute />} />
      <Route path="/trips/:tripId" element={<TripRoute />} />
    </Routes>
  );
}
