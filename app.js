/*********************************************************************************
* The MIT License (MIT)                                                          *
*                                                                                *
* Copyright (c) 2022 KMi, The Open University UK                                 *
*                                                                                *
* Permission is hereby granted, free of charge, to any person obtaining          *
* a copy of this software and associated documentation files (the "Software"),   *
* to deal in the Software without restriction, including without limitation      *
* the rights to use, copy, modify, merge, publish, distribute, sublicense,       *
* and/or sell copies of the Software, and to permit persons to whom the Software *
* is furnished to do so, subject to the following conditions:                    *
*                                                                                *
* The above copyright notice and this permission notice shall be included in     *
* all copies or substantial portions of the Software.                            *
*                                                                                *
* THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR     *
* IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,       *
* FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL        *
* THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER     *
* LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,  *
* OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN      *
* THE SOFTWARE.                                                                  *
*                                                                                *
**********************************************************************************/

const STORE_NAME = 'CommunicaTest3';

let linkchains = {}
let ethereum = {}
let account = "";

let provider = {};
let signer = {};

let template = {
	"@context": {
		"@vocab": "https://blockchain.kmi.open.ac.uk/vocab/"
	},
	"processor": {
		"version": "2.0.1",
		"url": "https://rdf.js.org/comunica-browser/versions/v2/engines/query-sparql/comunica-browser.js",
	},
	"sources": "",
	"query": "",
	"results": "",
	"explanations": {
		"physical": "",
		"logical": "",
		"parsed": ""
	}
}


/**
 * Initialise page - load any stored data from browser storage.
 */
function initApp() {

	/** load any stored hashes onto the screen **/
	if (window.localStorage.getItem(STORE_NAME)) {
		loadStoredData();
	} else {
		// setup an empty hash store
		window.localStorage.setItem(STORE_NAME, '[]');
	}

	// reference linkchains
	linkchains = window.linkchains();
	console.log(linkchains);

	// connect this webpage to ethereum through metamask
	setUpEthereumAndMetamask();

}


/**
 * Setup ethereum and metmask.
 */
async function setUpEthereumAndMetamask() {
	ethereum = window.ethereum;

	// A Web3Provider wraps a standard Web3 provider, which is
	// what MetaMask injects as window.ethereum into each page
	provider = new ethers.providers.Web3Provider(window.ethereum)
	console.log('provider:', provider);

	// The MetaMask plugin also allows signing transactions to
	// send ether and pay to change state within the blockchain.
	// For this, you need the account signer...
	signer = provider.getSigner();
	console.log('signer:', signer);

	// Check if logged into MetaMask already
	if (typeof ethereum !== 'undefined') {

		// detect Network change and reassign provider and signer
		ethereum.on('chainChanged', async function () {
			provider = new ethers.providers.Web3Provider(window.ethereum)
			console.log('provider:', provider);
			signer = provider.getSigner();
			console.log('signer:', signer);
		});

		// detect an account change
		ethereum.on("accountsChanged", () => {
			if (account != ethereum.selectedAddress) {
				account = ethereum.selectedAddress;
				document.getElementById('ethereumaccount').innerHTML = account;
			}
		});

		if (ethereum.isMetaMask) {
			console.log('MetaMask is installed');
		}

		if (ethereum.selectedAddress == "" || ethereum.selectedAddress == null) {
			const button = document.getElementById('enableEthereumButton');
			button.disabled = false;
		} else {
			const button = document.getElementById('enableEthereumButton');
			button.disabled = true;
			enableMetaMaskButtons();
			account = ethereum.selectedAddress;
			document.getElementById('ethereumaccount').innerHTML = account;
		}
	} else {
		const button = document.getElementById('enableEthereumButton');
		button.disabled = false;
		console.log('MetaMask needs to be installed');
	}
}

/**
 * Start the metamask extension for user to login.
 */
async function loginToMetaMask() {

	let reply = await ethereum.request({ method: 'eth_requestAccounts' });

	if (ethereum.selectedAddress) {
		const button = document.getElementById('enableEthereumButton');
		button.disabled = true;

		enableMetaMaskButtons();

		account = ethereum.selectedAddress;
		document.getElementById('ethereumaccount').innerHTML = account;
	} else {
		alert("Please select a MetaMask account to use with this page");
	}
}

/**
 * Ask MetaMask for the details of the current network selected.
 */
async function getNetwork() {
	try {
		// get the chain id of the current blockchain your wallet is pointing at.
		const chainId = await signer.getChainId();
		//console.log(chainId);

		// get the network details for the given chain id.
		const network = await provider.getNetwork(chainId);
		//console.log(network);

		return network;
	} catch (e) {
		throw e;
	}
}

/**
 * Ask MetaMask to switch to the network in the networkObj passed in.
 */
async function switchNetwork(networkObj) {
	try {
		let chainId = networkObj.chainId;
		chainId = parseInt(chainId);
		const hexChainId = ethers.utils.hexValue(chainId);

		await ethereum.request({
			method: 'wallet_switchEthereumChain',
			params: [{ chainId: hexChainId }],
		});

		provider = new ethers.providers.Web3Provider(window.ethereum)
		console.log('provider:', provider);
		signer = provider.getSigner();
		console.log('signer:', signer);
		await selectNetwork();

	} catch (switchError) {
		// This error code indicates that the chain has not been added to MetaMask.
		console.log(switchError);
		if (switchError.code === 4902) {
			throw new Error("The required network is not available in your MetaMask, please add: " + networkObj.name);
		} else {
			throw new Error("Failed to switch to the network");
		}
	}
}

/**
 * Enable metamask dependent buttons after connected to Metamask
 */
function enableMetaMaskButtons() {

	const anchorButton = document.getElementById('anchorButton');
	anchorButton.disabled = false;
}

/**
 * Run a query and get the plans
 */
async function runQuery() {

	let sources = document.getElementById("sources").value;
	sources = sources.trim();
	if (sources == "") {
		alert("Please supply at least one source");
		return;
	}
	let sourcesArray = sources.split(',');

	let query = document.getElementById("query").value;
	query = query.trim();
	if (query == "") {
		alert("Please supply a query");
		return;
	}

	const queryResults = document.getElementById("queryResults");
	const physcialResults = document.getElementById("physcialResults");
	const logicalResults = document.getElementById("logicalResults");
	const parsedResults = document.getElementById("parsedResults");

	try {
		// https://fragments.dbpedia.org/2015/en
		// SELECT * {    ?s ?p <http://dbpedia.org/resource/Belgium>.    ?s ?p ?o.  } LIMIT 100
		// CONSTRUCT { ?s ?p ?o . } WHERE {    ?s ?p <http://dbpedia.org/resource/Belgium>.    ?s ?p ?o.  } LIMIT 100
		// DESCRIBE <http://dbpedia.org/resource/Belgium>
		// ASK {?s ?p <http://dbpedia.org/resource/Belgium>}
		// INSERT DATA {<http://dbpedia.org/resource/Belgium> <http://www.w3.org/2002/07/owl#sameAs> <http://dbpedia.org/resource/FakeBelgium> .}

		const engine = new Comunica.QueryEngine();
		const result = await engine.query(query, { sources: sourcesArray, });
		//console.log(result);

		let mediaType = null;
		let resultString = "";

		if (result.resultType === 'bindings') {
			mediaType = 'application/sparql-results+json';
		} else if (result.resultType === 'quads') {
			mediaType = 'text/turtle';
		}
		switch (result.resultType) {
			case 'bindings':
			case 'quads':
				const { data } = await engine.resultToString(result, mediaType);
				data.on('data', function (chunk) {
					resultString += chunk;
				});
				data.on('end', () => {
					resultString += "";
				});
				break;
			case 'boolean':
				const booleanResult  = await engine.queryBoolean(query, { sources: sourcesArray, });
				resultString += booleanResult;
				break;
			case 'void':
				await engine.resultToString(result, mediaType);
				resultString += "A query that returns no output was executed.";
			default:
				break;
		}

		const physicalPlan = await engine.explain(query, { sources: sourcesArray, }, 'physical');
		physcialResults.value = JSON.stringify(physicalPlan, null, 2);
		//console.log(physicalPlan);

		const logicalPlan = await engine.explain(query, { sources: sourcesArray, }, 'logical');
		logicalResults.value = JSON.stringify(logicalPlan, null, 2);
		//console.log(logicalPlan);

		const parsedPlan = await engine.explain(query, { sources: sourcesArray, }, 'parsed');
		parsedResults.value = JSON.stringify(parsedPlan, null, 2);
		//console.log(parsedPlan);
		queryResults.value = resultString; //JSON.stringify(resultString, null, 2);

	} catch (e) {
		console.log(e);
	}
}

/**
 * Create a new JSON object with the query details, and query plans and anchor with linkchains.
 */
async function anchorPlan() {

	let sources = document.getElementById("sources").value;
	sources = sources.trim();
	if (sources == "") {
		alert("Please supply a source URL");
		return;
	}

	let query = document.getElementById("query").value;
	query = query.trim();
	if (query == "") {
		alert("Please supply a query");
		return;
	}

	let queryResults = document.getElementById("queryResults").value;
	queryResults = queryResults.trim();
	if (queryResults == "") {
		alert("Please run a query first");
		return;
	}

	let physcialResults = document.getElementById("physcialResults").value;
	physcialResults = physcialResults.trim();
	if (physcialResults == "") {
		alert("Please run a query first");
		return;
	}

	let logicalResults = document.getElementById("logicalResults").value;
	logicalResults = logicalResults.trim();
	if (logicalResults == "") {
		alert("Please run a query first");
		return;
	}

	let parsedResults = document.getElementById("parsedResults").value;
	parsedResults = parsedResults.trim();
	if (parsedResults == "") {
		alert("Please run a query first");
		return;
	}

	// copy the template
	const newTemplate = JSON.parse(JSON.stringify(template));

	let sourcesArray = sources.split(',');

	newTemplate.sources = sourcesArray;
	let escapedQuery = query.replace(/"/g, '\\"');
	escapedQuery = escapedQuery.replace(/\n+/g, ' ')
	newTemplate.query = escapedQuery;
	newTemplate.results = JSON.parse(queryResults);
	newTemplate.explanations.physical = JSON.parse(physcialResults);
	newTemplate.explanations.logical = JSON.parse(logicalResults);
	newTemplate.explanations.parsed = JSON.parse(parsedResults);

	console.log(newTemplate);

	try {
		let anchoredData = document.getElementById("anchoredData");
		anchoredData.value = JSON.stringify(newTemplate, null, 2);

		let metadataResults = document.getElementById("metadataResults");
		metadataResults.value = "Depending on the input size, this can take a while. Please wait while processing..."

		// get the metadata
		const metadata = await linkchains.getVerificationMetadata(newTemplate, {});
		// draw the result to screen
		metadataResults.value = JSON.stringify(metadata, null, 2);

		// add data to
		const anchoredResults = document.getElementById('anchoredResults');

		// requires no additional options as it is using the default Linkchain MerQL Contract way of anchoring
		let options = {};

		anchoredResults.value = "Waiting for MetaMask and to be mined....";

		// anchor the metadata
		const anchoredMetadata = await linkchains.anchorMetadata(metadata, options, deployMerQLAnchorContract);
		// write anchored results to screen
		anchoredResults.value = JSON.stringify(anchoredMetadata, null, 2);

		let granularAnchoredResults = document.getElementById("granularAnchoredResults");
		granularAnchoredResults.value = "Depending on the input size, this can take a while. Please wait while processing..."

		// get granular acnhored metadata
		const granularMetaData = await linkchains.getGranularVerificationMetadata(newTemplate, anchoredMetadata);
		// draw the result to screen
		granularAnchoredResults.value = JSON.stringify(granularMetaData, null, 2);

	} catch (e) {
		console.log(e);
		anchoredResults.value = e;
	}
}

/*** ANCHOR HELPER FUNCTIONS ***/

/**
 * Helper function to help linkchains anchorMetadata function write to the blockchain and use MetaMask to sign the transaction
 */
async function deployMerQLAnchorContract(anchor, options) {

	const abi = contract.MerQLAnchorContract.abi;
	const bytecode = contract.MerQLAnchorContract.bytecode;

	try {
		const currentNetwork = await getNetwork();
		delete currentNetwork._defaultProvider; // we don't want that bit

		const factory = new ethers.ContractFactory(abi, bytecode, signer);

		var indexHash = anchor.indexhash;
		var newIndexType = anchor.settings.indexType; //following lines take their values from merkleOutput too
		var lsds = anchor.settings.lsd;
		var div = "" + anchor.settings.divisor; // because it needs to be a string in the smart contract, not a number.
		var quadHashFunctionIn = anchor.settings.quadHash;
		var treeHashFunctionIn = anchor.settings.treeHash;
		var indexHashFunctionIn = anchor.settings.indexHash;

		var contractArgs = [
			indexHash,
			newIndexType,
			lsds,
			div,
			quadHashFunctionIn,
			treeHashFunctionIn,
			indexHashFunctionIn,
		];

		const contract = await factory.deploy(contractArgs[0], contractArgs[1], contractArgs[2], contractArgs[3], contractArgs[4], contractArgs[5], contractArgs[6]);
		const receipt = await contract.deployTransaction.wait();
		const result = {
			address: receipt.contractAddress,
			account: account,
			transactionHash: receipt.transactionHash,
			network: currentNetwork
		};

		return Object.assign(anchor, result);

	} catch (e) {
		console.log(e);
		throw (e);
	}
}

/*** LOCAL DATA STORAGE FUNCTIONS ***/

/**
 * Load any previously stored local data
 */
function loadStoredData() {

	var storedDataTable = document.getElementById("storedDataTable");
	// empty any old data on screen
	storedDataTable.innerHTML = "";

	var dataDetailsArray = JSON.parse(window.localStorage.getItem(STORE_NAME));
	if (!dataDetailsArray) {
		dataDetailsArray = [];
	}

	var count = dataDetailsArray.length;
	for (var i = 0; i < count; i++) {
		var next = dataDetailsArray[i];

		// Create an empty <tr> element and add it to the 1st position of the table:
		var row = storedDataTable.insertRow(i);

		// Insert new cells (<td> elements) at the 1st and 2nd position of the "new" <tr> element:
		const dateColumn = row.insertCell(0);
		const sourceColumn = row.insertCell(1);
		const queryColumn = row.insertCell(2);
		const resultColumn = row.insertCell(3);
		const anchoredDataColumn = row.insertCell(4);
		const anchoredColumn = row.insertCell(5);
		const granularAnchoredColumn = row.insertCell(6);

		// Add some text to the new cells:
		dateColumn.innerHTML = (new Date(next.date)).toLocaleDateString('en-GB') + " - " + (new Date(next.date)).toLocaleTimeString('en-GB');
		sourceColumn.innerHTML = '<a href="' + next.sourceURL + '" target="_blank">' + next.sources + '</a>';

		let queryButton = document.createElement("button");
		queryButton.innerHTML = "View Query";
		queryButton.className = "button";
		queryButton.data = next.query;
		queryButton.onclick = function () {
			var popup = document.getElementById("popupDiv");
			var popupText = document.getElementById("popupText");
			popupText.value = this.data;
			popup.style.visibility = "visible";
		};
		queryColumn.appendChild(queryButton);

		let resultButton = document.createElement("button");
		resultButton.innerHTML = "View Query Results";
		resultButton.className = "button";
		resultButton.data = next.queryResults;
		resultButton.onclick = function () {
			var popup = document.getElementById("popupDiv");
			var popupText = document.getElementById("popupText");
			popupText.value = this.data;
			popup.style.visibility = "visible";
		};
		resultColumn.appendChild(resultButton);

		let anchoredDataButton = document.createElement("button");
		anchoredDataButton.innerHTML = "View Trace Data";
		anchoredDataButton.className = "button";
		anchoredDataButton.data = next.anchoredData;
		anchoredDataButton.onclick = function () {
			var popup = document.getElementById("popupDiv");
			var popupText = document.getElementById("popupText");
			var obj = JSON.parse(this.data);
			popupText.value = this.data //JSON.stringify(obj, null, 2);
			popup.style.visibility = "visible";
		};
		anchoredDataColumn.appendChild(anchoredDataButton);

		let anchoredButton = document.createElement("button");
		anchoredButton.innerHTML = "View Anchored MetaData";
		anchoredButton.className = "button";
		anchoredButton.data = next.anchoredResults;
		anchoredButton.onclick = function () {
			var popup = document.getElementById("popupDiv");
			var popupText = document.getElementById("popupText");
			var obj = JSON.parse(this.data);
			popupText.value = JSON.stringify(obj, null, 2);
			popup.style.visibility = "visible";
		};
		anchoredColumn.appendChild(anchoredButton);

		let granularAnchoredButton = document.createElement("button");
		granularAnchoredButton.innerHTML = "View Granular MetaData";
		granularAnchoredButton.className = "button";
		granularAnchoredButton.data = next.granularAnchoredResults;
		granularAnchoredButton.onclick = function () {
			var popup = document.getElementById("popupDiv");
			var popupText = document.getElementById("popupText");
			var obj = JSON.parse(this.data);
			popupText.value = JSON.stringify(obj, null, 2);
			popup.style.visibility = "visible";
		};
		granularAnchoredColumn.appendChild(granularAnchoredButton);
	}

}

/**
 * Clear Store
 */
function clearDataStore() {
	if (window.confirm("Do you really want to delete all your stored data?")) {
		window.localStorage.setItem(STORE_NAME, '[]');
		loadStoredData();
	}
}

/**
 * Store current hash details
 */
function storeData() {

	let sources = document.getElementById("sources").value;
	sources = sources.trim();
	if (sources == "") {
		alert("There is no source to save");
		return;
	}

	let query = document.getElementById("query").value;
	query = query.trim();
	if (query == "") {
		alert("There is no query to save");
		return;
	}

	let queryResults = document.getElementById("queryResults").value;
	queryResults = queryResults.trim();
	if (queryResults == "") {
		alert("There are no query results to save");
		return;
	}

	let anchoredData = document.getElementById("anchoredData").value;
	anchoredData = anchoredData.trim();
	if (anchoredData == "") {
		alert("There is no anchor data to save");
		return;
	}

	let anchoredResults = document.getElementById("anchoredResults").value;
	anchoredResults = anchoredResults.trim();
	if (anchoredResults == "") {
		alert("There are no anchor results to save");
		return;
	}

	let granularAnchoredResults = document.getElementById("granularAnchoredResults").value;
	granularAnchoredResults = granularAnchoredResults.trim();
	if (granularAnchoredResults == "") {
		alert("There are no granualr results to save");
		return;
	}

	/*
	console.log(sources);
	console.log(query);
	console.log(queryResults);
	console.log(anchoredData);
	console.log(anchoredResults);
	console.log(granularAnchoredResults);
	*/

	// Store the details into the Browser local storage
	if (!window.localStorage.getItem(STORE_NAME)) {
		window.localStorage.setItem(STORE_NAME, []);
	}

	const dataDetailsArray = JSON.parse(window.localStorage.getItem(STORE_NAME));
	let newItem = {};
	newItem.date = new Date().getTime();
	newItem.sources = sources;
	newItem.query = query;
	newItem.queryResults = queryResults;
	newItem.anchoredData = anchoredData;
	newItem.anchoredResults = anchoredResults;
	newItem.granularAnchoredResults = granularAnchoredResults;
	dataDetailsArray.push(newItem);

	window.localStorage.setItem(STORE_NAME, JSON.stringify(dataDetailsArray));

	// clear fields for next go
	document.getElementById("sources").value = "";
	document.getElementById("query").value = "";
	document.getElementById("queryResults").value = "";
	document.getElementById("physcialResults").value = "";
	document.getElementById("logicalResults").value = "";
	document.getElementById("parsedResults").value = "";
	document.getElementById("anchoredData").value = "";
	document.getElementById("metadataResults").value = "";
	document.getElementById("anchoredResults").value = "";
	document.getElementById("granularAnchoredResults").value = "";

	// reload stored data so new entry appears on screen
	loadStoredData();
}

/**
 * Close data popup
 */
function closePopup() {
	var popup = document.getElementById("popupDiv");
	popup.style.visibility = "hidden";
}

/**
 * Copy popup contents to system Clipboard
 */
function copyToClipboard() {
	var popupText = document.getElementById("popupText");
	navigator.clipboard.writeText(popupText.innerHTML);
}
