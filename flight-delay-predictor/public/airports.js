// Airport list used by the autocomplete, the "Use my location" button and the
// live weather lookup. Works in the browser and in Node (require("./public/airports")).
// Each entry: [code, name, latitude, longitude]
(function (g) {
  const AIRPORTS = [
    ["DEL", "Delhi", 28.56, 77.10], ["BOM", "Mumbai", 19.09, 72.87], ["BLR", "Bengaluru", 13.20, 77.71],
    ["HYD", "Hyderabad", 17.24, 78.43], ["MAA", "Chennai", 12.99, 80.17], ["CCU", "Kolkata", 22.65, 88.45],
    ["PNQ", "Pune", 18.58, 73.92], ["AMD", "Ahmedabad", 23.08, 72.63], ["GOI", "Goa (Dabolim)", 15.38, 73.83],
    ["GOX", "Goa (Mopa)", 15.74, 73.86], ["COK", "Kochi", 10.15, 76.40], ["TRV", "Thiruvananthapuram", 8.48, 76.92],
    ["JAI", "Jaipur", 26.82, 75.81], ["LKO", "Lucknow", 26.76, 80.88], ["GAU", "Guwahati", 26.11, 91.59],
    ["IXC", "Chandigarh", 30.67, 76.79], ["PAT", "Patna", 25.59, 85.09], ["BBI", "Bhubaneswar", 20.24, 85.82],
    ["IDR", "Indore", 22.72, 75.80], ["NAG", "Nagpur", 21.09, 79.05], ["VNS", "Varanasi", 25.45, 82.86],
    ["SXR", "Srinagar", 33.99, 74.77], ["IXB", "Bagdogra", 26.68, 88.33], ["CCJ", "Kozhikode", 11.14, 75.95],
    ["IXE", "Mangaluru", 12.96, 74.89], ["VGA", "Vijayawada", 16.53, 80.80], ["VTZ", "Visakhapatnam", 17.72, 83.22],
    ["CJB", "Coimbatore", 11.03, 77.04], ["IXM", "Madurai", 9.83, 78.09], ["RPR", "Raipur", 21.18, 81.74],
    ["IXR", "Ranchi", 23.31, 85.32], ["ATQ", "Amritsar", 31.71, 74.80], ["DED", "Dehradun", 30.19, 78.18],
    ["UDR", "Udaipur", 24.62, 73.90], ["BHO", "Bhopal", 23.29, 77.34],
    ["DXB", "Dubai", 25.25, 55.36], ["AUH", "Abu Dhabi", 24.43, 54.65], ["DOH", "Doha", 25.27, 51.61],
    ["SIN", "Singapore", 1.36, 103.99], ["BKK", "Bangkok", 13.69, 100.75], ["KUL", "Kuala Lumpur", 2.75, 101.71],
    ["HKG", "Hong Kong", 22.31, 113.91], ["CMB", "Colombo", 7.18, 79.88], ["KTM", "Kathmandu", 27.70, 85.36],
    ["LHR", "London Heathrow", 51.47, -0.45], ["CDG", "Paris", 49.01, 2.55], ["FRA", "Frankfurt", 50.03, 8.57],
    ["JFK", "New York JFK", 40.64, -73.78], ["SFO", "San Francisco", 37.62, -122.38], ["SYD", "Sydney", -33.94, 151.18],
    ["NRT", "Tokyo Narita", 35.77, 140.39],
  ];
  const AIRLINES = ["IndiGo", "Air India", "SpiceJet", "Akasa Air", "Air India Express", "Alliance Air", "Emirates", "Qatar Airways", "Etihad"];
  g.AIRPORTS = AIRPORTS;
  g.AIRLINES = AIRLINES;
  if (typeof module !== "undefined" && module.exports) module.exports = { AIRPORTS, AIRLINES };
})(typeof window !== "undefined" ? window : globalThis);
