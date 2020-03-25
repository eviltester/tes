
function TweetStormer(){

    var scheduledRenderUpdate=false;
    var splitOnMarkDownLine = false;

    var bracketedTemplates = ["{x}", "{x}/{of}", "{x},{of}", "{x} / {of}", "{x}...{of}", "{x} of {of}", "{x} - {of}"];

    var countTemplates = ["- {x},{of}"];
    var countTemplate = "{x}/{of}";

    for(var t=0; t<bracketedTemplates.length; t++){
        countTemplates.push(bracketedTemplates[t]);
        countTemplates.push("{" + bracketedTemplates[t] + "}");
        countTemplates.push("[" + bracketedTemplates[t] + "]");
        countTemplates.push("(" + bracketedTemplates[t] + ")");
    }

    this.chooseCountTemplate = function(index){

        if(index>countTemplates.length)
            return;

        countTemplate = countTemplates[index];
    }

    this.setCustomCountTemplate = function(aTemplate){
        countTemplate = aTemplate;
    }

    function scheduleRenderUpdate(){
        if(!scheduledRenderUpdate){
            scheduledRenderUpdate=true;
            setTimeout(function(){renderIt();scheduledRenderUpdate=false},1000);
        }
    }

    this.splitOnMarkdown = function(){
        splitOnMarkDownLine = true;
    }

    this.splitOnParagraph = function(){
        splitOnMarkDownLine = false;
    }


    function renderIt(){

        var storm = formatText();
        var tweets = storm.getTweets();
        for (var index = 0; index < tweets.length; ++index) {
            var aTweet = tweets[index];
            var outputline = aTweet.isOk() ? "--- : " : "!OK : " + aTweet.actualLength() + "/" + aTweet.maxLength;
            outputline += "\n" + aTweet.getText();
            console.log(outputline);
        }
        renderTweets(storm);
    }

    function renderTweets(storm){
        var tweets = storm.getTweets();
        var outputDiv = document.getElementById("output-area");

        // delete any?
        var tweetDivs = document.getElementsByClassName("tweettopost");
        if(tweetDivs.length>tweets.length){
            try{
                var deleteFrom = tweets.length;
                for(var delMe=deleteFrom+1; delMe <= tweetDivs.length; delMe++){
                    var delElement = document.getElementById("tweet"+delMe);
                    delElement.parentNode.removeChild(delElement);
                }
            }catch(err){
                // if there was an error we should probalby just delete them all
                // and start again
                outputDiv.innerHTML = "";
            }
        }

        for (var index = 0; index < tweets.length; ++index) {
            var aTweet = tweets[index];
            var existingElement = document.getElementById("tweet" + aTweet.getId());
            if(existingElement){
                existingElement.innerHTML = tweetAsInnerHtml(aTweet);
            }else{
                var temp= document.createElement('div');
                temp.innerHTML= tweetAsHtml(aTweet);
                outputDiv.appendChild(temp.firstChild);
            }
            // add event listener to copy button
            document.querySelector("button.copy-tweet[data-id='" + aTweet.getId() + "']").
            addEventListener("click",copyTweetTextToClipboard);
        }


    }

    function copyTweetTextToClipboard(event){
        var id = event.target.getAttribute("data-id");
        var element = document.getElementById("tweetcontent" + id);

        var range = document.createRange();
        range.selectNode(element);
        window.getSelection().removeAllRanges(); // clear current selection
        window.getSelection().addRange(range); // to select text
        document.execCommand("copy");
        window.getSelection().removeAllRanges();

        element.classList.add("copied");

    }

    function tweetAsInnerHtml(aTweet){
        var tweettext = aTweet.getText();

        if(splitOnMarkDownLine){
            tweettext= tweettext.replace(/\n/g, "<br/>");
        }

        var id = aTweet.getId();
        var tweetstatus = "";
        var tweetclass = "tweet-ok";
        if(!aTweet.isOk()){
            tweetstatus = "<strong>NOT OK Tweet : " + aTweet.actualLength() + "/" + aTweet.maxLength + "</strong>";
            tweetclass = "tweet-not-ok";
        }

        return `<p class="${tweetclass}">${tweetstatus}<span id='tweetcontent${id}'>${tweettext}</span>
                <button data-id='${id}' class='copy-tweet'>copy</button></p>
                `;
    }

    function tweetAsHtml(aTweet){

        var id = aTweet.getId();
        var innerHtml= tweetAsInnerHtml(aTweet);

        return `<div id='tweet${id}' data-id='${id}' class='tweettopost'>
            ${innerHtml}
         </div>`;
    }

    function formatText(){

        var theText = document.getElementById("original-text").value;

        var output = parseText(theText);
        console.log(output);
        return output;
    }

    function Tweet(text){
        this.text = text;
        this.length=0;
        this.id;
        this.partOfStorm=null;
        this.countTemplate = "{x}/{of}";

        this.maxLength = 280;

        this.stormIndexText = function(){
            return " " + this.countTemplate.replace("{x}", this.id).replace("{of}",this.partOfStorm.getStormCount());
        }

        this.actualLength = function(){
            return this.getText().length;
        }

        this.isOk = function(){
            return this.actualLength()<=this.maxLength;
        }

        this.getText = function(){
            return this.text + this.stormIndexText();
        }

        this.setId = function(anId){
            this.id = anId;
        }

        this.partOf = function(storm){
            this.partOfStorm = storm;
        }

        this.getId = function(){
            return this.id;
        }

        this.useCountTemplate = function(template){
            this.countTemplate = template;
        }
    }

    function TweetStorm(){
        this.tweets = [];
        this.countTemplate = "{x}/{of}";

        this.addTweet = function(theTweetText){
            if(theTweetText.trim().length>0){
                var aTweet = new Tweet(theTweetText);
                this.tweets.push(aTweet);
                aTweet.setId(this.tweets.length);
                aTweet.partOf(this);
                aTweet.useCountTemplate(this.countTemplate);
            }
        }

        this.setCountTemplate = function(template){
            this.countTemplate = template;
        }

        this.getStormCount = function(){
            return this.tweets.length;
        }

        this.getTweets = function(){
            return this.tweets;
        }
    }

    function parseText(someText){
        var listOfText = someText.split(/\r?\n/);

        if(splitOnMarkDownLine) {
            listOfText = someText.split(/---\r?\n/);
        }

        var storm = new TweetStorm();
        storm.setCountTemplate(countTemplate);

        for (var index = 0; index < listOfText.length; ++index) {
            if(listOfText[index].trim().length>0){
                storm.addTweet(listOfText[index], countTemplate);
            }
        }

        return storm;
    }



    this.monitorForChanges = function(idOfElement){
        document.getElementById(idOfElement).addEventListener("input", scheduleRenderUpdate);
    }


    const controlGuiTemplate = `
               <details>
                <summary>Config</summary>
                <label for="tweetstorm-count-templates">Count Template:</label>

                <select id="tweetstorm-count-templates">
                </select>

                <br/>

                <label for="tweetstorm-custom-template">Custom Template:</label>
                <input id="tweetstorm-custom-template" placeholder="e.g. {x}/{of}" type="text">
                <button id="tweetstorm-setcustom-template">Set</button>

                <br/>

                <p>Split Formatting:</p>
                <label for="tweetstorm-paraformatting">Paragraph</label>
                <input type="radio" name="splitformatting" id="tweetstorm-paraformatting" value="para"><br>
                <label for="tweetstorm-markdownformatting">Markdown (---)</label>
                <input type="radio" name="splitformatting" id="tweetstorm-markdownformatting" value="markdown"><br>
            </details>
    `;

    this.createGui = function(idOfContainer){

        const container = document.getElementById(idOfContainer);

        if(container==null){
            return;
        }

        container.innerHTML=controlGuiTemplate;

        countTemplatesSelect = document.getElementById("tweetstorm-count-templates");
        for (var index = 0; index < countTemplates.length; ++index) {
            anoption = document.createElement("option");
            anoption.value = countTemplates[index];
            anoption.innerText = countTemplates[index];
            if(anoption.value==countTemplate){
                anoption.selected=true;
            }
            countTemplatesSelect.appendChild(anoption);
        }

        document.getElementById("tweetstorm-setcustom-template").setAttribute("placeholder", "e.g. " + countTemplate);

        if(splitOnMarkDownLine){
            document.getElementById("tweetstorm-markdownformatting").checked=true;
        }else{
            document.getElementById("tweetstorm-paraformatting").checked=true;
        }

        // setup change event for select
        document.getElementById("tweetstorm-count-templates").addEventListener("change", function(){
            document.tweetStormer.renderCustomCountTemplate(document.getElementById("tweetstorm-count-templates").value);
        });

        // allow setting custom template
        document.getElementById("tweetstorm-setcustom-template").addEventListener("click", function(){
            document.tweetStormer.renderCustomCountTemplate(document.getElementById("tweetstorm-custom-template").value);
        });

        // allow choosing a different split
        document.getElementById("tweetstorm-markdownformatting").addEventListener("change", function(){
            document.tweetStormer.setSplitBasedOnGUI();
        });
        document.getElementById("tweetstorm-paraformatting").addEventListener("change", function(){
            document.tweetStormer.setSplitBasedOnGUI();
        });
    }

    this.setSplitBasedOnGUI = function(){
        if(document.getElementById("tweetstorm-markdownformatting").checked){
            this.splitOnMarkdown();
        }else{
            this.splitOnParagraph();
        }
        renderIt();
    }

    this.renderCustomCountTemplate = function(template){
        this.setCustomCountTemplate(template);
        renderIt();
    }
}

document.addEventListener('DOMContentLoaded', function() {
    document.tweetStormer = new TweetStormer();
    document.tweetStormer.createGui("tweetstorm-control-gui");
    document.tweetStormer.monitorForChanges("original-text");
}, false);
