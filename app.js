/*eslint-env node*/

//------------------------------------------------------------------------------
// node.js starter application for Bluemix
//------------------------------------------------------------------------------

// This application uses express as its web server
// for more info, see: http://expressjs.com
/*eslint-disable no-param-reassign, no-else-return*/
var express = require('express');
var Crawler = require("js-crawler");
var cors = require('cors');

//CORS configuration
var corsOptions = {
  origin: 'https://easymarket-operation.mybluemix.net',
  optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204 
}


//LINKS
var extraUrl = "http://www.deliveryextra.com.br/?utm_source=Extras&utm_medium=Menu&utm_campaign=Alimentos&nid=200803";

//REGEX
var regexCategories = /\/figure>(\s|\n)*[a-zA-Z\u00C0-\u00FB]+(\s|\n)*/;
var regexCategoryLink = /href=\".*delivery.*\"+?/;

var regexNav = /<li class=\"nav-item((\n|.)*?\/a>)/g;

//REGEX UTILS
var clearWhiteSpace = /[a-zA-Z\u00C0-\u00FB0-9\-\'\.\+]+(\s+[a-zA-Z\u00C0-\u00FB0-9\-\'\.\+]+)*/;

// cfenv provides access to your Cloud Foundry environment
// for more info, see: https://www.npmjs.com/package/cfenv
var cfenv = require('cfenv');

// create a new express server
var app = express();

// serve the files out of ./public as our main files
app.use(express.static(__dirname + '/public'));

// get the app environment from Cloud Foundry
var appEnv = cfenv.getAppEnv();

// start server on the specified port and binding host
app.listen(appEnv.port, '0.0.0.0', function() {
  // print a message when the server starts listening
  console.log("server starting on " + appEnv.url);
});

/*app.use(function(req, res, next) {
  //res.header('Access-Control-Allow-Origin', req.get('Origin') || '*');
  res.header('Access-Control-Allow-Origin', 'https://easymarket-operation.mybluemix.net');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE');
  res.header('Access-Control-Expose-Headers', 'Content-Length');
  res.header('Access-Control-Allow-Headers', 'Accept, Authorization, Content-Type, X-Requested-With, Range');
  if (req.method === 'OPTIONS') {
  	console.log("\n\n\n\------------------Send Option response------------------------\n\n\n");
    return res.send(200);
  } else {
  	console.log("\n\n\n\------------------Send normal response------------------------\n\n\n");
  	//console.log("res is " + res);
  	return next();
  }
});*/



app.get("/api/categories", cors(corsOptions), function (request, response) {
	console.log("\n\n\n\------------------Start Categories Crawl------------------------\n\n\n");
	var categories = [];
	var crawler = new Crawler().configure({ignoreRelative: false, depth: 1});
	crawler.crawl({
 		url: extraUrl,
 		success: function(page) {
			var navTitles = page.content.match(regexNav);

			for(var i = 0; i<navTitles.length; i++){
		        navTitles[i] = translateHtml(navTitles[i]);
		        var category = {};
		        category.name = getCategory(navTitles[i], regexCategories);
		        if(category.name){
		            category.link = getLink(navTitles[i], regexCategoryLink);
		            if(category.link){
		                categories.push(category);
		            }
		        }
	        
		    }
    	//console.log(page.content);
    	},
		failure: function(page) {
	    	console.log(page.status);
		},
		finished: function(crawledUrls) {
		    for(var i = 0; i<categories.length; i++){
		        console.log("\nCategoria " + i + ": " + categories[i].name);
		        console.log("Link is: " + categories[i].link);
		    }
		    console.log(crawledUrls);
		    console.log("\n\n\n\------------------END CATEGORIES------------------------\n\n\n");
		    //response.writeHead(200, { 'Content-Type': 'application/json' });
		    //response.end(categories[0]);
			response.json(categories);

		}
	});

	
});

//Utils
function crawlCategory(){
	
}

function translateHtml(htmlText){
    htmlText = replaceAll(htmlText, "&acirc;","â");
    htmlText = replaceAll(htmlText, "&ecirc;","ê");
    htmlText = replaceAll(htmlText, "&icirc;","î");
    htmlText = replaceAll(htmlText, "&ocirc;","ô");
    htmlText = replaceAll(htmlText, "&ucirc;","û");
    htmlText = replaceAll(htmlText, "&Acirc;","Â");
    htmlText = replaceAll(htmlText, "&Ecirc;","Ê");
    htmlText = replaceAll(htmlText, "&Icirc;","Î");
    htmlText = replaceAll(htmlText, "&Ocirc;","Ô");
    htmlText = replaceAll(htmlText, "&Ucirc;","Û");
    
    htmlText = replaceAll(htmlText, "&atilde;","ã");
    htmlText = replaceAll(htmlText, "&etilde;","ẽ");
    htmlText = replaceAll(htmlText, "&itilde;","ĩ");
    htmlText = replaceAll(htmlText, "&otilde;","õ");
    htmlText = replaceAll(htmlText, "&utilde;","ĩ");
    
    htmlText = replaceAll(htmlText, "&aacute;","á");
    htmlText = replaceAll(htmlText, "&eacute;","é");
    htmlText = replaceAll(htmlText, "&iacute;","í");
    htmlText = replaceAll(htmlText, "&oacute;","ó");
    htmlText = replaceAll(htmlText, "&uacute;","ú");
    htmlText = replaceAll(htmlText, "&Aacute;","Á");
    htmlText = replaceAll(htmlText, "&Eacute;","É");
    htmlText = replaceAll(htmlText, "&Iacute;","Í");
    htmlText = replaceAll(htmlText, "&Oacute;","Ó");
    htmlText = replaceAll(htmlText, "&Uacute;","Ú");

    htmlText = replaceAll(htmlText, "&acute;","'");

    htmlText = replaceAll(htmlText, "&ccedil;","ç");

    htmlText = replaceAll(htmlText, "&amp;","&");

    return htmlText;
}

function replaceAll(text, oldString, newString){
    var index = 0;
    while (index !== -1){
        text = text.replace(oldString, newString);
        index = text.indexOf(oldString);
    }
    return text;
}

function getCategory(htmlText, categoryRegex){
    var categoryTag = htmlText.match(categoryRegex);
        if(categoryTag){
            var category = cleanFigureTag(categoryTag[0], "\/figure>");
            category = (category.match(clearWhiteSpace))[0];
            return category;    
        }
        return null;     
}


function getLink(htmlText, regexCondition){
    var linkTag = htmlText.match(regexCondition);
    if(linkTag){
        var link = linkTag[0];
        link = replaceAll(link, "href=\"", "");
        link = replaceAll(link, "\"", "");
        return link;
    }
    return null;
}

function cleanFigureTag(categoryTag, tagName){
      return categoryTag.substring(tagName.length);
  }


