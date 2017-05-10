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
var supermarketBaseUrl = {"extra":"http://www.deliveryextra.com.br/",
                          "paoDeAcucar":"http://www.paodeacucar.com/"};

//REGEX
var regexCategories = {"extra":/\/figure>(\s|\n)*[a-zA-Z\u00C0-\u00FB]+(\s|\n)*/,
                       "paoDeAcucar":/<span([^]*?\<)/};
var regexCategoryLink = {"extra":/href=\".*delivery.*\"+?/,
                         "paoDeAcucar":/href=\".*paodeacucar.*?\"+?/};

var regexSubCategories = {"extra":/<a class=\"facetItemLabel aside((\n|.)*?\/a>)/g,
                          "paoDeAcucar":/aside-nav__link[^]*?\/a/g};
var regexSubCategoryName = /\">[a-zA-Z\u00C0-\u00FB]+(\s*[a-zA-Z\u00C0-\u00FB]+)*/g;
var regexSubCategoryLink = /href=\".+?\"+?/;
var regexNextButton = /class="button.+icon--angle-right".+?href=.+?\">/;

var regexNav = {"extra":/<li class=\"nav-item((\n|.)*?\/a>)/g,
                "paoDeAcucar":/<li class="item_menu([^]*?\/a>)/g};

var regexProducts = {"extra":/class=\"boxProduct showcase-item((\n|.|\s)*?<!)/g,
                     "paoDeAcucar":/class=\"showcase-item__price((\n|.|\s)*?<\/a)/g};
var regexProductUnavailable = {"extra":/./g,
                               "paoDeAcucar":/class=\"showcase-item__info((\n|.|\s)*?<\/a)/g}
var regexProductsName = {"extra":/title=\"((\n|\s)*[a-zA-Z\u00C0-\u00FB0-9\-\'\.\+]+(\n|\s)*)+/g,
                         "paoDeAcucar":/nome=\"((\n|\s)*[a-zA-Z\u00C0-\u00FB0-9\-\'\.\+]+(\n|\s)*)+/g};
var nameTag = {"extra":"title=\"",
               "paoDeAcucar":"nome=\""}
var regexProductsSku = {"extra":/./g,
                         "paoDeAcucar":/sku="[0-9]+/g};
var skuTag = {"extra":"",
               "paoDeAcucar":"sku=\""}               
var regexPrice = /class="value">[0-9]+\,[0-9][0-9]/;
var regexProductLink = /href=\".+?\"/;
var productLinkTagString = "produto/";

//REGEX UTILS
var clearWhiteSpace = /[a-zA-Z\u00C0-\u00FB0-9\-\'\.\+]+(\s+[a-zA-Z\u00C0-\u00FB0-9\-\'\.\+]+)*/;
var regexGenericLink = /href=\".+?\"/;
var regexAlphaNumeric = /(\s|\n)*[a-zA-Z\u00C0-\u00FB]+(\s|\n)*/g;

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
        url: supermarketBaseUrl["extra"],
        success: function(page) {
            categories = getCategories(page, regexNav["extra"], regexCategories["extra"], regexCategoryLink["extra"]);
          },
        failure: function(page) {
            console.log(page.status);
        },
        finished: function() {
            for(var i = 0; i<categories.length; i++){
                crawledCategoryArray.push(false);
              }

            
            for(i = 0; i<categories.length; i++){
                crawlCategory(i, "extra", response);

            }
            console.log("\n\n\n\------------------END CATEGORIES------------------------\n\n\n");

        }
      });

  
});

app.get("/api/pao-de-acucar", cors(corsOptions), function (request, response) {
    console.log("\n\n\n\------------------Start Categories Crawl------------------------\n\n\n");
    supermarketId = 2;
    crawledCategoryArray = [];
    crawledSubCategoryArray = [];
    crawledProductArray = [];
    console.log("Crawling pão de açúcar");
    var crawler = new Crawler().configure({ignoreRelative: false, depth: 1});
    crawler.crawl({
        url: supermarketBaseUrl["paoDeAcucar"],
        success: function(page) {
            categories = getCategoriesPaoDeAcucar(page, regexNav["paoDeAcucar"], regexCategories["paoDeAcucar"], regexCategoryLink["paoDeAcucar"]);
          },
        failure: function(page) {
            console.log(page.status);
        },
        finished: function() {
            for(var i = 0; i<categories.length; i++){
                crawledCategoryArray.push(false);
              }
            
            for(i = 0; i<categories.length; i++){
                crawlCategory(i, "paoDeAcucar", response);

            }
            console.log("\n\n\n\------------------END CATEGORIES------------------------\n\n\n");

        }
      });

  
});

function getCategoriesPaoDeAcucar(page, regexNav, regexCategories, regexCategoryLink){
    var categories = [];
    //console.log("page is : " + page.content);
    //var regexTest = /<li class="item_menu((\n|.)*?\/a>)/g;
    var navTitles = page.content.match(regexNav);[]
    for(var i = 0; i<navTitles.length; i++){
        navTitles[i] = translateHtml(navTitles[i]);
        var category = {};
        category.name = getCategoryPaoDeAcucar(navTitles[i], regexCategories);
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



function getCategories(page, regexNav, regexCategories, regexCategoryLink){
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

//Utils
function crawlCategory(index, supermarket, response){
    var crawlerCategory = new Crawler().configure({ignoreRelative: false, depth: 1});
    crawlerCategory.crawl({
        url: categories[index].link,
        success: function(page) {
            if(categories){
                categories[index].subCategories = getSubCategories(page, regexSubCategories[supermarket]);
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
                //response.json(categories);
                for(var indexCategory = 0; indexCategory < categories.length; indexCategory++){
                    for(var indexSubcategory = 0; indexSubcategory < categories[indexCategory].subCategories.length; indexSubcategory++)
                        crawledSubCategoryArray.push(false);
                }
              
                var crawledSubCategoryArrayIndex = 0;
                for(indexCategory = 0; indexCategory < categories.length; indexCategory++){
                    for(indexSubcategory = 0; indexSubcategory < categories[indexCategory].subCategories.length; indexSubcategory++){
                        categories[indexCategory].subCategories[indexSubcategory].products = [];
                        crawlSubCategory(supermarket, supermarketBaseUrl[supermarket] + categories[indexCategory].subCategories[indexSubcategory].link, indexCategory, indexSubcategory, crawledSubCategoryArrayIndex, [], response);
                        crawledSubCategoryArrayIndex++;
                    }
                }
            }
        }
    });
}

function getSubCategories(page, regexSubCategories){
    var subcategories = [];
    var subcategoriesHTML = page.content.match(regexSubCategories);
    for(var i = 0; i<subcategoriesHTML.length; i++){
        var subcategory = {};
        subcategoriesHTML[i] = translateHtml(subcategoriesHTML[i]);
        subcategory.name = getSubCategoryName(subcategoriesHTML[i], regexSubCategoryName);
          
        if(subcategory.name){
            subcategory.link = getLink(subcategoriesHTML[i], regexSubCategoryLink);
              
            if(subcategory.link){
                subcategories.push(subcategory);
            }
        }
          
    }
    return subcategories;
  }

function crawlSubCategory(supermarket, subcategoryLink, indexCategory, indexSubcategory, crawledSubCategoryArrayIndex, products, response){
    var crawler = new Crawler().configure({ignoreRelative: false, depth: 1});
    var lastPage = true;
    crawler.crawl({
        url: subcategoryLink,
        success: function(page) {
            var nextButtonHtmlArray = page.content.match(regexNextButton);
            var productsHtml = page.content.match(regexProducts[supermarket]);
            //var unavailableProducts = regexProductUnavailable
            if(productsHtml) {
                for(var i = 0; i<productsHtml.length; i++){
                    var product = {};
                    productsHtml[i] = translateHtml(productsHtml[i]);
                    product.name = getProductName(productsHtml[i], regexProductsName[supermarket], nameTag[supermarket]);
                  
                    if(product.name){
                        product.link = getLink(productsHtml[i], regexProductLink).split(supermarketBaseUrl[supermarket])[1];
                        if(product.link){
                            product.price = getPrice(productsHtml[i], regexPrice);
                            //if(supermarket === "extra")
                            product.id = getProductId(product.link, productLinkTagString);
                            /*else if(supermarket === "paoDeAcucar"){
                                product.id = getProductSkuRegex(productsHtml[i], regexProductsSku[supermarket], skuTag[supermarket]);
                            }*/
                            product.subcategories = categories[indexCategory].subCategories[indexSubcategory].name;
                            products.push(product);
                        }
                    }
                  
                }
            }
            
            if(nextButtonHtmlArray){
                var nextButtonHtml = translateHtml(nextButtonHtmlArray[0]);
                var subcategoryBaseLink = supermarketBaseUrl[supermarket] + (categories[indexCategory].subCategories[indexSubcategory].link.split("?"))[0];
                var nextButtonLink = getLink(nextButtonHtml, regexGenericLink);
                nextButtonLink = subcategoryBaseLink + nextButtonLink;
                lastPage = false;
                crawlSubCategory(supermarket, nextButtonLink, indexCategory, indexSubcategory, crawledSubCategoryArrayIndex, products, response);
            }

      

        },
        failure: function(page) {
          console.log("Error while crawling subcategory: " + categories[indexCategory].subCategories[indexSubcategory].name + "\n Link is " + subcategoryLink + "\nstatus: " + page.status);
        },
        finished: function() {
            if(lastPage){
                crawledSubCategoryArray[crawledSubCategoryArrayIndex] = true;
                categories[indexCategory].subCategories[indexSubcategory].products = products;
                if(crawledSubCategoryArray.indexOf(false) === -1){
                    crawledSubCategoryArray = [];
                    console.log("\n\n\n\------------------END SUBCATEGORIES------------------------\n\n\n")
                    response.json(categories);
                }
            }
                
        }
    });
                    
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

function getCategoryPaoDeAcucar(htmlText, categoryRegex){
        var categoryTag = htmlText.match(categoryRegex);
        if(categoryTag){
            var category = categoryTag[0].match(regexAlphaNumeric);
            return category[1];    
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

function getProductName(productHtmlText, regexProductName, tag){
    var nameTag = productHtmlText.match(regexProductName);
    if(nameTag){
        var productName = cleanFigureTag(nameTag[0], tag);
        productName = (productName.match(clearWhiteSpace))[0];
        return productName;
    }
    return null;
}

function getProductId(productLink, productLinkTag){
    var idString = productLink.split(productLinkTag)[1];
    idString = idString.split("/");
    var id = parseInt(idString, 10);
    return id;
}

function getProductSkuRegex(productHtmlText, regexProductSku, tag){
    var skuTag = productHtmlText.match(regexProductSku);
    if(skuTag){
        var productSku = cleanFigureTag(skuTag[0], tag);
        productSku = (productSku.match(clearWhiteSpace))[0];
        return productSku;
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


