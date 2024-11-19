const periodicRefreshPeriod = 10;
let categories = [];
let selectedCategory = "";
let currentETag = "";
let hold_Periodic_Refresh = false;
let pageManager;
let waitingGifTrigger = 2000;
let waiting = null;
let itemLayout;
let search = "";

function addWaitingGif() {
    clearTimeout(waiting);
    waiting = setTimeout(() => {
        $("#itemsPanel").append($("<div id='waitingGif' class='waitingGifcontainer'><img class='waitingGif' src='Loading_icon.gif' /></div>'"));
    }, waitingGifTrigger);
}

function removeWaitingGif() {
    clearTimeout(waiting);
    $("#waitingGif").remove('');
}

Init_UI();

async function Init_UI() {
    itemLayout = {
        width: $("#sample").outerWidth(),
        height: $("#sample").outerHeight()
    };
    pageManager = new PageManager('scrollPanel', 'itemsPanel', itemLayout, renderNews);
    compileCategories();  
    $("#search").show();
    $('#abort').on("click", async function () {
        showNews()
    });
    $("#createNews").on("click", function() {
        renderNewsForm(); 
    });
    $("#searchKey").on("change", () => {
        doSearch();
    })
    $('#doSearch').on('click', () => {
        doSearch();
    })
    showNews();
    $("#newsForm").hide();
    $("#aboutContainer").hide();
    start_Periodic_Refresh();
}
function doSearch() {
    search = $("#searchKey").val().replace(' ', ',');
    pageManager.reset();
}
function showNews() {
    $("#actionTitle").text("Liste des articles");
    $("#scrollPanel").show();
    $('#abort').hide();
    $('#newsForm').hide();
    $('#aboutContainer').hide();
    $("#createNews").show();
    hold_Periodic_Refresh = false;
}

function hideNews() {
    $("#scrollPanel").hide(); 
    $("#createNews").hide();
    $("#abort").show();
    hold_Periodic_Refresh = true;
}


function start_Periodic_Refresh() {
    setInterval(async () => {
        if (!hold_Periodic_Refresh) {
            let etag = await News_API.HEAD();
            if (currentETag != etag) {
                currentETag = etag;
                pageManager.update(false);
                compileCategories();
            }
        }
    }, periodicRefreshPeriod * 1000);
}

async function compileCategories() {
    categories = [];
    let response = await News_API.GetQuery("?fields=category&sort=category");
    if (!News_API.error) {
        let items = response.data;
        if (items != null) {
            items.forEach(item => {
                if (!categories.includes(item.Category))
                    categories.push(item.Category);
            });
            updateDropDownMenu(categories);
        }
    }
}

function updateDropDownMenu() {
    let DDMenu = $("#DDMenu");
    let selectClass = selectedCategory === "" ? "fa-check" : "fa-fw";
    DDMenu.empty();
    DDMenu.append($(`
        <div class="dropdown-item menuItemLayout" id="allCatCmd">
            <i class="menuIcon fa ${selectClass} mx-2"></i> Toutes les catégories
        </div>
        `));
    DDMenu.append($(`<div class="dropdown-divider"></div>`));
    categories.forEach(category => {
        selectClass = selectedCategory === category ? "fa-check" : "fa-fw";
        DDMenu.append($(`
            <div class="dropdown-item menuItemLayout category" id="allCatCmd">
                <i class="menuIcon fa ${selectClass} mx-2"></i> ${category}
            </div>
        `));
    })
    DDMenu.append($(`<div class="dropdown-divider"></div> `));
    DDMenu.append($(`
        <div class="dropdown-item menuItemLayout" id="aboutCmd">
            <i class="menuIcon fa fa-info-circle mx-2"></i> À propos...
        </div>
        `));
    $('#aboutCmd').on("click", function () {
        renderAbout();
    });
    $('#allCatCmd').on("click", function () {
        showNews();
        selectedCategory = "";
        updateDropDownMenu();
        pageManager.reset();
    });
    $('.category').on("click", function () {
        showNews();
        selectedCategory = $(this).text().trim();
        updateDropDownMenu();
        pageManager.reset();
    });
}
function renderAbout() {
    hideNews();
    $("#actionTitle").text("À propos...");
    $("#aboutContainer").show();
}

async function renderNews(queryString) {
    let endOfData = false;
    queryString += "&sort=category";
    if (selectedCategory != "") queryString += "&category=" + selectedCategory;
    if (search != "") queryString += "&keywords=" + search;
    addWaitingGif();
    let response = await News_API.Get(queryString);
    if (!News_API.error) {
        currentETag = response.ETag;
        let NewsItems = response.data;
        if (NewsItems.length > 0) {
            NewsItems.forEach(News => {
                $("#itemsPanel").append(renderNewsItem(News));
            });
            $(".editCmd").off();
            $(".editCmd").on("click", function () {
                renderEditNewsForm($(this).attr("editNewsId"));
            });
            $(".deleteCmd").off();
            $(".deleteCmd").on("click", function () {
                renderDeleteNewsForm($(this).attr("deleteNewsId"));
            });
        } else
            endOfData = true;
    } else {
        renderError(News_API.currentHttpError);
    }
    removeWaitingGif();
    return endOfData;
}
function renderError(message) {
    hideNews();
    $("#search").hide();
    $("#actionTitle").text("Erreur du serveur...");
    $("#errorContainer").show();
    $("#errorContainer").append($(`<div>${message}</div>`));
}

function newNewsItem() {
    let news = {};
    news.Id = 0;
    news.Title = "";
    news.Text = "";
    news.Category = "";
    news.Image = ""
    news.Creation = new Date().toISOString();
    return news;
}   
async function renderEditNewsForm(id) {
    addWaitingGif();
    let response = await News_API.Get(id)
    if (!News_API.error) {
        let News = response.data;
        if (News !== null)
            renderNewsForm(News);
        else
            renderError("Bookmark introuvable!");
    } else {
        renderError(News_API.currentHttpError);
    }
    removeWaitingGif();
}
async function renderDeleteNewsForm(id) {
    hideNews();
    $("#actionTitle").text("Retrait");
    $('#newsForm').show();
    $('#newsForm').empty();
    
    let response = await News_API.Get(id);
    if (!News_API.error) {
        let news = response.data;
        
        if (news !== null) {
            $("#newsForm").append(`
                <div class="NewsRow" id="${news.Id}">
                 <h4>Effacer l'article suivant?</h4>
                    <div class="NewsContainer noselect">
                        <div class="NewsHeader">
                            <div class="NewsCategory">${news.Category}</div>
                            <div class="TitleAndIcons">
                                <div class="NewsTitle">${news.Title}</div>
                                <span class="editCmd cmdIcon fa fa-pencil" editNewsId="${news.Id}" title="Modifier ${news.Title}"></span>
                                <span class="deleteCmd cmdIcon fa fa-trash" deleteNewsId="${news.Id}" title="Effacer ${news.Title}"></span>
                            </div>
                        </div>
                        <img src="${news.Image}" alt="News Image" class="NewsImage">
                        <div class="NewsDate">${convertToFrenchDate(news.Creation)}</div>
                        <div class="NewsText">${news.Text}</div>
                    </div>
                    <div class="buttonContainer">
                        <input type="button" value="Effacer" id="deleteNews" class="btn btn-primary">
                        <input type="button" value="Annuler" id="cancel" class="btn btn-secondary">
                    </div>
                </div>
            `);
            
            $('#deleteNews').on("click", async function () {
                await News_API.Delete(news.Id);
                if (!News_API.error) {
                    showNews();
                    pageManager.update(false);
                    compileCategories();
                } else {
                    console.log(News_API.currentHttpError);
                    renderError("Une erreur est survenue!");
                }
            });
            
            $('#cancel').on("click", function () {
                showNews();
            });

        } else {
            renderError("Article introuvable!");
        }
    } else {
        renderError(News_API.currentHttpError);
    }
}
function renderNewsForm(newsItem = null) {
    hideNews();
    let isCreateMode = newsItem == null; 
    if (isCreateMode) newsItem = newNewsItem(); 

    let creationDate = Date.now() - (5 * 60 * 60 * 1000) 

    $("#actionTitle").text(isCreateMode ? "Création" : "Modification");
    $("#newsForm").show();
    $("#newsForm").empty();
    $("#newsForm").append(`
        <form id="NewsForm" class="form">
            <input type="hidden" name="Id" value="${newsItem.Id}">
            <div class="form-group">
                <label for="title">Titre:</label>
                <input type="text" class="form-control" name="Title" value="${newsItem.Title}" required>
            </div>
            <div class="form-group">
                <label for="text">Contenu:</label>
                <textarea class="form-control" name="Text" required>${newsItem.Text}</textarea>
            </div>
            <div class="form-group">
                <label for="category">Catégorie:</label>
                <input type="text" class="form-control" name="Category" value="${newsItem.Category}" required>
            </div>
             <label class="form-label">Image </label>
            <div   class='imageUploader' 
                   newImage='${isCreateMode}' 
                   controlId='Image' 
                   imageSrc='${newsItem.Image}' 
                   waitingImage="Loading_icon.gif">
            </div>
            <input 
                type="hidden" 
                name="Creation" 
                value="${creationDate}"
            />
            <div class="buttonContainer">
                <input type="submit" value="${isCreateMode ? 'Créer' : 'Modifier'}" class="btn btn-primary">
                <input type="button" value="Annuler" id="cancel" class="btn btn-secondary">
            </div>
        </form>
    `);
    initImageUploaders();
    initFormValidation();
    $('#NewsForm').on("submit", async function (event) {
        event.preventDefault();
        let newsData = getFormData($(this)); 
        News = await News_API.Save(newsData, isCreateMode);
        if (!News_API.error) {
            showNews(); 
            await pageManager.update(false);
            compileCategories();
        } else {
            renderError("Une erreur est survenue!"); 
        }
    });

    $('#cancel').on("click", function () {
        showNews();
    });
}
function getFormData($form) {
    const removeTag = new RegExp("(<[a-zA-Z0-9]+>)|(</[a-zA-Z0-9]+>)", "g");
    var jsonObject = {};
    $.each($form.serializeArray(), (index, control) => {
        jsonObject[control.name] = control.value.replace(removeTag, "");
    });
    return jsonObject;
}
function convertToFrenchDate(numeric_date) {
    date = new Date(numeric_date);
    var options = { year: 'numeric', month: 'long', day: 'numeric' };
    var opt_weekday = { weekday: 'long' };
    var weekday = toTitleCase(date.toLocaleDateString("fr-FR", opt_weekday));

    function toTitleCase(str) {
        return str.replace(
            /\w\S*/g,
            function (txt) {
                return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
            }
        );
    }
    return weekday + " le " + date.toLocaleDateString("fr-FR", options) + " @ " + date.toLocaleTimeString("fr-FR");
}
function renderNewsItem(news) {
    return $(`
       <div class="NewsRow" id="${news.Id}">
            <div class="NewsContainer noselect">
                <div class="NewsHeader">
                    <div class="NewsCategory">${news.Category}</div>
                    <div class="TitleAndIcons">
                        <div class="NewsTitle">${news.Title}</div>
                        <span class="editCmd cmdIcon fa fa-pencil" editNewsId="${news.Id}" title="Modifier ${news.Title}"></span>
                        <span class="deleteCmd cmdIcon fa fa-trash" deleteNewsId="${news.Id}" title="Effacer ${news.Title}"></span>
                    </div>
                </div>
                <img src="${news.Image}" alt="News Image" class="NewsImage">
                <div class="NewsDate">${convertToFrenchDate(news.Creation)}</div>
                <div class="NewsText">${news.Text}</div>
            </div>
       </div>
    `);
}