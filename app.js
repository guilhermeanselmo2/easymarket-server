'use strict';
/*eslint-env node*/

//------------------------------------------------------------------------------
// node.js starter application for Bluemix
//------------------------------------------------------------------------------

// This application uses express as its web server
// for more info, see: http://expressjs.com
/*eslint-disable no-param-reassign, no-else-return*/

/*globals crawledCategoryArray */
var express = require('express');
var Crawler = require("js-crawler");
var cors = require('cors');


//CORS configuration
var whiteList = ['https://easymarket-operation.mybluemix.net', 'http://localhost:6003', 'http://localhost:3000'];
var corsOptions = {
  origin: function(origin, callback){
        if(whiteList.indexOf(origin) !== -1 || whiteList.indexOf(origin) === -1){
            console.log("Origin: " + origin + " is whitelisted");
            callback(null, true);      
        } else {
            callback(new Error(origin + ' is not allowed by CORS'));
        }
    }
};


//LINKS
var extraUrl = "http://www.deliveryextra.com.br/?utm_source=Extras&utm_medium=Menu&utm_campaign=Alimentos&nid=200803";

//REGEX
var regexCategories = /\/figure>(\s|\n)*[a-zA-Z\u00C0-\u00FB]+(\s|\n)*/;
var regexCategoryLink = /href=\".*delivery.*\"+?/;

var regexSubCategories = /<a class=\"facetItemLabel aside((\n|.)*?\/a>)/g;
var regexSubCategoryName = /\">[a-zA-Z\u00C0-\u00FB]+(\s*[a-zA-Z\u00C0-\u00FB]+)*/g;
var regexSubCategoryLink = /href=\".+?\"+?/;
var regexNextButton = /class="button.+icon--angle-right".+?href=.+?\">/;

var regexNav = /<li class=\"nav-item((\n|.)*?\/a>)/g;

var regexExtraProducts = /class=\"boxProduct showcase-item((\n|.|\s)*?<!)/g;
var regexExtraProductsName = /title=\"((\n|\s)*[a-zA-Z\u00C0-\u00FB0-9\-\'\.\+]+(\n|\s)*)+/g;
var regexExtraPrice = /class="value">[0-9]+\,[0-9][0-9]/;
var regexProductLink = /href=\".+?\"/;
var regexProductId = /\"productId\".+?>/;

//REGEX UTILS
var clearWhiteSpace = /[a-zA-Z\u00C0-\u00FB0-9\-\'\.\+]+(\s+[a-zA-Z\u00C0-\u00FB0-9\-\'\.\+]+)*/;
var regexGenericLink = /href=\".+?\"/;

//LINKS
var extraBaseLink = "http://www.deliveryextra.com.br";

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

/*globals crawledCategoryArray */
var crawledCategoryArray = [];
var crawledSubCategoryArray = [];
var crawledProductArray = [];

var supermarketId = 1;

var categories = [];

app.get("/api/categories", cors(corsOptions), function (request, response) {
    console.log("\n\n\n\------------------Start Categories Crawl------------------------\n\n\n");
  
    crawledCategoryArray = [];
    crawledSubCategoryArray = [];
    crawledProductArray = [];
    var crawler = new Crawler().configure({ignoreRelative: false, depth: 1});
    crawler.crawl({
        url: extraUrl,
        success: function(page) {
            categories = getCategories(page);
          },
        failure: function(page) {
            console.log(page.status);
        },
        finished: function() {
            for(var i = 0; i<categories.length; i++){
                crawledCategoryArray.push(false);
              }

            
            for(i = 0; i<categories.length; i++){
                crawlCategory(i, response);

            }
            console.log("\n\n\n\------------------END CATEGORIES------------------------\n\n\n");

        }
      });

  
});

function getCategories(page){
    var categories = [];
    var navTitles = page.content.match(regexNav);

  for(var i = 0; i<navTitles.length; i++){
        navTitles[i] = translateHtml(navTitles[i]);
        var category = {};
        category.name = getCategory(navTitles[i], regexCategories);
        if(category.name){
            category.link = getLink(navTitles[i], regexCategoryLink);
            category.supermarketId = supermarketId;
            if(category.link){
                categories.push(category);
            }
        }
    }
    return categories;
}

function getSubCategories(page){
    var subcategories = [];
    var subcategoriesHTML = page.content.match(regexSubCategories);
    for(var i = 0; i<subcategoriesHTML.length; i++){
        var subcategory = {};
        subcategoriesHTML[i] = translateHtml(subcategoriesHTML[i]);
        subcategory.name = getSubCategoryName(subcategoriesHTML[i], regexSubCategoryName);
          
        if(subcategory.name){
            subcategory.link = getLink(subcategoriesHTML[i], regexSubCategoryLink);
            //subcategory.link = subcategory.link;              
              
            if(subcategory.link){
                subcategories.push(subcategory);
            }
        }
          
    }
    return subcategories;
  }

//Utils
function crawlCategory(index, response){
    var crawlerCategory = new Crawler().configure({ignoreRelative: false, depth: 1});
    crawlerCategory.crawl({
        url: categories[index].link,
        success: function(page) {
            if(categories){
                categories[index].subCategories = getSubCategories(page);
                }
            else
                console.log("No categories available");
        },
        failure: function(page) {
            console.log(page.status);
        },
        finished: function() {
            crawledCategoryArray[index] = true;
            if(crawledCategoryArray.indexOf(false) === -1){
                crawledCategoryArray = [];
                console.log("Finished Crawling Categories");
                for(var indexCategory = 0; indexCategory < categories.length; indexCategory++){
                    for(var indexSubcategory = 0; indexSubcategory < categories[indexCategory].subCategories.length; indexSubcategory++)
                        crawledSubCategoryArray.push(false);
                }
              
                var crawledSubCategoryArrayIndex = 0;
                for(indexCategory = 0; indexCategory < categories.length; indexCategory++){
                    for(indexSubcategory = 0; indexSubcategory < categories[indexCategory].subCategories.length; indexSubcategory++){
                        categories[indexCategory].subCategories[indexSubcategory].products = [];
                        crawlSubCategory(extraBaseLink + categories[indexCategory].subCategories[indexSubcategory].link, indexCategory, indexSubcategory, crawledSubCategoryArrayIndex, [], response);
                        crawledSubCategoryArrayIndex++;
                    }
                }
            }
        }
    });
}

function crawlSubCategory(subcategoryLink, indexCategory, indexSubcategory, crawledSubCategoryArrayIndex, products, response){
    var crawler = new Crawler().configure({ignoreRelative: false, depth: 1});
    var lastPage = true;
    crawler.crawl({
        url: subcategoryLink,
        success: function(page) {

            var nextButtonHtmlArray = page.content.match(regexNextButton);
            var productsHtml = page.content.match(regexExtraProducts);
    
            for(var i = 0; i<productsHtml.length; i++){
                var product = {};
                productsHtml[i] = translateHtml(productsHtml[i]);
                product.name = getProductName(productsHtml[i], regexExtraProductsName);
              
                if(product.name){
                    product.link = getLink(productsHtml[i], regexProductLink).split(extraBaseLink)[1];
                    if(product.link){
                        product.price = getPrice(productsHtml[i], regexExtraPrice);
                        product.id = 0;
                        product.scatg = categories[indexCategory].subCategories[indexSubcategory].name + "_" + categories[indexCategory].subCategories[indexSubcategory].count;
                        products.push(product);
                    }
                }
              
            }
            
            if(nextButtonHtmlArray){
                var nextButtonHtml = translateHtml(nextButtonHtmlArray[0]);
                var subcategoryBaseLink = extraBaseLink + (categories[indexCategory].subCategories[indexSubcategory].link.split("?"))[0];
                var nextButtonLink = getLink(nextButtonHtml, regexGenericLink);
                nextButtonLink = subcategoryBaseLink + nextButtonLink;
                lastPage = false;
                crawlSubCategory(nextButtonLink, indexCategory, indexSubcategory, crawledSubCategoryArrayIndex, products, response);
            }

      

        },
        failure: function(page) {
          console.log(page.status);
        },
        finished: function() {
            if(lastPage){
                crawledSubCategoryArray[crawledSubCategoryArrayIndex] = true;
                categories[indexCategory].subCategories[indexSubcategory].products = products;
                if(crawledSubCategoryArray.indexOf(false) === -1){
                    crawledSubCategoryArray = [];
                    console.log("\n\n\n\------------------END SUBCATEGORIES------------------------\n\n\n");
                    
                    for(var productIndexCategory = 0; productIndexCategory < categories.length; productIndexCategory++){
                        
                    }
                    callCrawlProduct(0, 0, response);
                    //response.json(categories);
                }
            }
            /*for(var i = 0; i<products.length; i++){
                //crawlProduct(products[i]);
            }*/
                
        }
    });
                    
}

function crawlProduct(productLink, crawlProductIndexCategory, crawlProductIndexSubcategory, crawlProductIndexProduct, crawledProductArrayIndex, response){
    var crawler = new Crawler().configure({ignoreRelative: false, depth: 1});
    crawler.crawl({
        url: productLink,
        success: function(page) {
            //console.log("Subcategory: " + categories[crawlProductIndexCategory].subCategories[crawlProductIndexSubcategory].name + " at index " + crawlProductIndexSubcategory);
            categories[crawlProductIndexCategory].subCategories[crawlProductIndexSubcategory].products[crawlProductIndexProduct].id = page.content.match(regexProductId);      
        },
        failure: function(page) {
          console.log(page.status);
        },
        finished: function() {
            crawledProductArray[crawledProductArrayIndex] = true;
            if(crawledProductArray.indexOf(false) === -1){
                crawlProductIndexSubcategory++;
                if(crawlProductIndexSubcategory >= categories[crawlProductIndexCategory].subCategories.length){
                    crawlProductIndexCategory++;
                    crawlProductIndexSubcategory = 0;
                    if(crawlProductIndexCategory < categories.length){
                        callCrawlProduct(crawlProductIndexCategory, crawlProductIndexSubcategory, response);
                    } else {
                        console.log("\n\n\n\------------------END PRODUCTS------------------------\n\n\n");
                        response.json(categories);
                    }
                } else {
                    callCrawlProduct(crawlProductIndexCategory, crawlProductIndexSubcategory, response); 
                }
            }            
        }
    });
                    
}

function callCrawlProduct(productIndexCategory, productIndexSubcategory, response){
    var crawledProductArrayIndex = 0;
    crawledProductArray = [];
    //console.log(categories[productIndexCategory].name + "->" + categories[productIndexCategory].subCategories[productIndexSubcategory].name + ": " + categories[productIndexCategory].subCategories[productIndexSubcategory].products.length);
    for(var indexProduct = 0; indexProduct < categories[productIndexCategory].subCategories[productIndexSubcategory].products.length; indexProduct++){
        crawledProductArray.push(false);
    }
    
    for(indexProduct = 0; indexProduct < categories[productIndexCategory].subCategories[productIndexSubcategory].products.length; indexProduct++){
        crawlProduct(categories[productIndexCategory].subCategories[productIndexSubcategory].products[indexProduct].link, productIndexCategory, productIndexSubcategory, indexProduct, crawledProductArrayIndex, response);
        crawledProductArrayIndex++;
    }
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

function getSubCategoryName(htmlText, regexSubCategoryName){
    var subCategoryTag = htmlText.match(regexSubCategoryName);
        if(subCategoryTag){
            var subCategoryName = cleanFigureTag(subCategoryTag[0], "\">");
            return subCategoryName;    
        }
        return null;     
}

function getProductName(productHtmlText, regexProductName){
    var nameTag = productHtmlText.match(regexProductName);
    if(nameTag){
        var productName = cleanFigureTag(nameTag[0], "title=\"");
        productName = (productName.match(clearWhiteSpace))[0];
        return productName;
    }
    return null;
}

function getPrice(productHtmlText, regexProductPrice){
    var priceTag = productHtmlText.match(regexProductPrice);
    if(priceTag){
        var price = cleanFigureTag(priceTag[0], "class=\"value\">");
        return price;
    }
    return null;
}


