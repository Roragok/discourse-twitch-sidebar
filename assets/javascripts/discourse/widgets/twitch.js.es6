import { createWidget } from 'discourse/widgets/widget';
import { h } from 'virtual-dom';

let layoutsError;
let layouts;


try {
  layouts = requirejs('discourse/plugins/discourse-layouts/discourse/lib/layouts');
} catch(error) {
  layouts = { createLayoutsWidget: createWidget };
  console.error(error);
}

const removeSpinner = () => { $('.stream-container').removeClass('spinner'); };

//remove streamers, dividers and add spinner again during clear
const clearStreamers = () => {
  return new Promise(function (resolve){
    $('.stream-container > hr').remove();
    $('a.streamer,.no-streamer').remove();
    $('.stream-container').addClass('spinner');
    setTimeout(() => { resolve('done'); },25);
  });
};

const getSiteStreamData = () => {
  return new Promise(function (resolve, reject){
    $.getJSON(`https://stream.namafia.com/v1/states`, function(data){
        //resolve to true if the stream is live
        resolve(data.repeat_to_local_nginx.type === 'connected');
    });
  });
};

const getLiveStreamerData = (names, clientId, accessToken) => {
  //returns a promise so we can use then statements below
  return new Promise(function (resolve, reject){
    fetch(`https://api.twitch.tv/helix/streams?user_login=${names.join('&user_login=')}`,{
      headers: {
        'Client-ID': clientId,
        'Authorization': 'Bearer '+ accessToken,
      },})
    .then((response) => { return response.json(); })
    .then((streamList) => {
      if(streamList.data !== undefined) {
        const liveStreamers = streamList.data.filter(stream => stream.type === 'live');
        resolve(sortStreamers(liveStreamers));
      }
    });
  });
};

//sort streamers by viewers in descending order.
const sortStreamers = (streamers, otherStreamers = []) => {
  //if a second array was passed we add it here.
  const allStreamers = [...streamers, ...otherStreamers];
  function compare(a, b){ return b.viewer_count - a.viewer_count; }
  //converts to a set to remove any dupes
  const sorted = new Set(allStreamers.sort(compare));
  return sorted;
};

//appends streamers to the stream container.
const appendStreamers = (streamers, className = "") => {
  [...streamers].map(({user_name, viewer_count, title}) => {
    removeSpinner();
    $('.stream-container').append(`<hr/><a class="streamer ${user_name} ${className} visible"
      target="_blank" alt="twitch stream" title="${title}" href="https://twitch.tv/${user_name}">
        <div class="streamer-wrapper clearfix">
          <div alt="${user_name}'s stream" class="streamer-name">${user_name}</div>
          <div alt="${viewer_count} viewers" class="viewer-count">${viewer_count}</div>
        </div>
    </a>`);
  });
};

//after a small period we'll check if there are any appended streamers and append a message if there isnt any
const checkStreamerCount = (length = 50) => {
  setTimeout( function(){ if($("a.streamer").length < 1) {removeSpinner();
      $('.stream-container').append('<hr/><div class="no-streamer"><span>No Active Streamers</span></div>');
  }},length);
};

//splits names to array, filters empty names, then deletes spaces and joins it together with &user_login for twitch call
const formatNames = (names = "") => {
  return names.split(",").filter(name => name.trim().length>0).map(name => name.trim());
};

const generateStreamers = (featuredNames,otherNames,additionalNames=false,clientId,accessToken) => {
  //if anime.namafia.com is live, we'll append it before we append the twitch streamers
  getSiteStreamData().then((siteStreamIsLive) => {if(siteStreamIsLive){
    appendStreamers([{ user_name: 'Site Stream', viewer_count: '1000+', title: 'The Official Site Stream'}],'site-stream');
  }});
  //get featured Streamers, then other streamers, then additional if need be
  getLiveStreamerData(featuredNames,clientId,accessToken)
  .then((featuredStreamers) => { getLiveStreamerData(otherNames,clientId,accessToken)
  //we'll handle other streamers here but we'll append featured streamers first
  .then((otherStreamers) => {
    //if additional names resort after getting them and then append
    if(additionalNames){
      getLiveStreamerData(additionalNames,clientId,accessToken)
      .then((additionalStreamers) => {
        appendStreamers(featuredStreamers);
        appendStreamers(sortStreamers(otherStreamers,additionalStreamers));
        checkStreamerCount(100);
    });}
    else{
      appendStreamers(featuredStreamers);
      //if no additional streamers just skip right to appending them
      appendStreamers(otherStreamers);
      checkStreamerCount(100);
    }
  });
  });
};

const setupTwitchSidebar = (featuredNames,otherNames,additionalNames) => {
  clearStreamers().then(()=>{
    generateStreamers(featuredNames,otherNames,additionalNames);
  });
};

//  Create our widget named twitch
export default layouts.createLayoutsWidget('twitch', {
  tagName: 'div.twich-users.widget-container',
  buildKey: () => 'twitch-users',

  defaultState(){
    return { rendered: 0 };
  },

  //  Create and render the HTML to display the streambox.
  html(attrs, state){
    // Output to be rendered
    let output = [];

    //  check if users are set
    if(this.siteSettings.twitch_sidebar_enabled){

      // Get the title of the stream box if set.
      output.push(h('h2#streams-title',this.siteSettings.twitch_sidebar_title));
      // add a spinner for while we load
      output.push(h('div.stream-container.spinner',""));

      // Twitch Client id
      const clientId = this.siteSettings.twitch_sidebar_client_id;
      // Twitch Access Token
      const accessToken = this.siteSettings.twitch_sidebar_access_token;

      // Get the list of users, set to empty if the setting is blank
      const featuredNames = formatNames(this.siteSettings.twitch_sidebar_featured_streamers);
      let otherNames = formatNames(this.siteSettings.twitch_sidebar_streamers) ; let additionalNames = false;
      //if theres more than 100 (MAX 200!) users in other, move part of it to an additional list
      if(otherNames.length > 100){
        additionalNames = otherNames.slice(100);
        otherNames = otherNames.slice(0,99);
      }
      generateStreamers(featuredNames,otherNames,additionalNames, clientId, accessToken);
      setTimeout( function(){
        $("h2#streams-title").attr("title","Click here to refresh!");
        //on Sidebar Title click we regenerate Streamers
        document.getElementById('streams-title').addEventListener('click', () => {
          setupTwitchSidebar(featuredNames,otherNames,additionalNames);
        });
      },40);
  return h('div.twitch-container',output);
  }
}
});
