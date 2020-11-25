

function mapApiResultToLegacyFormat(r) {
  if ( typeof r === "undefined" || r === null ) {
    console.error("mapApiResultToLegacyFormat: Empty param!");
    return false;
  }

  let legacy = {};
  legacy.country = r.country; // New
  legacy.countryInfo = r.countryInfo; // New. Replacing info
  legacy.total_cases = r.cases;
  legacy.total_recovered = r.recovered;
  legacy.total_unresolved = false;
  legacy.total_deaths = r.deaths;
  legacy.total_new_cases_today = r.todayCases;
  legacy.total_new_deaths_today = r.todayDeaths;
  legacy.total_active_cases = r.active;
  legacy.total_serious_cases = r.critical;
  legacy.casesPerOneMillion = r.casesPerOneMillion; // New
  legacy.deathsPerOneMillion = r.deathsPerOneMillion; // New

  return legacy;
}


module.exports = {
  mapApiResultToLegacyFormat : mapApiResultToLegacyFormat
};
