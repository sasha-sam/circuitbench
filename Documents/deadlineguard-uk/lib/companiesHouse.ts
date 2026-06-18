const BASE_URL = "https://api.company-information.service.gov.uk";

function getAuthHeader(): string {
  const key = process.env.COMPANIES_HOUSE_API_KEY;
  if (!key) throw new Error("Missing COMPANIES_HOUSE_API_KEY env var");
  return "Basic " + Buffer.from(`${key}:`).toString("base64");
}

async function chFetch(path: string) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { Authorization: getAuthHeader() },
    cache: "no-store",
  });

  if (res.status === 404) throw new Error("Company not found");
  if (!res.ok) throw new Error(`Companies House API error: ${res.status}`);

  return res.json();
}

export async function searchCompany(query: string) {
  return chFetch(
    `/search/companies?q=${encodeURIComponent(query)}&items_per_page=5`
  );
}

export async function getCompanyProfile(companyNumber: string) {
  return chFetch(`/company/${companyNumber.toUpperCase()}`);
}

export async function getOfficers(companyNumber: string) {
  return chFetch(`/company/${companyNumber.toUpperCase()}/officers?items_per_page=20`);
}

export async function getFilingHistory(companyNumber: string) {
  return chFetch(`/company/${companyNumber.toUpperCase()}/filing-history?items_per_page=15`);
}

export async function getPSC(companyNumber: string) {
  return chFetch(`/company/${companyNumber.toUpperCase()}/persons-with-significant-control?items_per_page=10`);
}
