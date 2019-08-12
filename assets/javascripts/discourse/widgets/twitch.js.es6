import { createWidget } from 'discourse/widgets/widget';
import { h } from 'virtual-dom';

const clearStreamers = () => {
  $('.stream-container').addClass('<div class="spinner"></div>');
  $('a.streamer,.stream-container > hr,.no-streamer').remove();
};

const removeSpinner = () => { $('.stream-container').removeClass('spinner'); };

const getSiteStreamData = () => {
  return new Promise(function (resolve, reject){
    $.getJSON(`https://stream.namafia.com/v1/states`, function(data){
        resolve(data.repeat_to_local_nginx.type === 'connected');
    });
  });
};

const getLiveStreamerData = (names) => {
  //returns a promise so we can use then statements below
  return new Promise(function (resolve, reject){
    fetch(`https://api.twitch.tv/helix/streams?user_login=${names.join('&user_login=')}`,{
      headers: {'Client-ID': 'xih7xf82qwbnhx45y4gmrlzibuzcu6',},})
    .then((response) => { return response.json(); })
    .then((streamList) => {
      if(streamList.data !== undefined) {
        const liveStreamers = streamList.data.filter(stream => stream.type === 'live');
        resolve(sortStreamers(liveStreamers));
      }
    });
  });
};

const sortStreamers = (streamers, otherStreamers = []) => {
  const allStreamers = [...streamers, ...otherStreamers];
  //Descending sort streamers by viewers
  function compare(a, b){ return b.viewer_count - a.viewer_count; }
  //converts to a set to remove any dupes
  const sorted = new Set(allStreamers.sort(compare));
  return sorted;
};

//appends streamers to the stream container.
const appendStreamers = (streamers, className = "") => {
  [...streamers].map(({user_name, viewer_count, title}) => {
    removeSpinner();
    $('.stream-container').append(`<hr/><a class="streamer ${user_name} ${className}"
      target="_blank" alt="twitch stream" title="${title}" href="https://twitch.tv/${user_name}">
        <div class="streamer-wrapper clearfix">
          <div alt="${user_name}'s stream" class="streamer-name">${user_name}</div>
          <div alt="${viewer_count} viewers" class="viewer-count">${viewer_count}</div>
        </div>
    </a>`);
  });
};

const checkStreamerCount = (length = 50) => {
  setTimeout( function(){ if($("a.streamer").length < 1) {
      removeSpinner();
      $('.stream-container').append('<hr/><div class="no-streamer"><span>No Active Streamers</span></div>');
  }},length);
};

const formatNames = (names = "") => {
  //filters empty names, then deletes spaces and joins it together with &user_login for twitch call
  return names.split(",").filter(name => name.trim().length>0).map(name => name.trim());
};

const generateStreamers = (featuredNames,otherNames,additionalNames) => {
  getSiteStreamData().then((siteStreamIsLive) => {if(siteStreamIsLive){
    appendStreamers([{ user_name: 'Site Stream', viewer_count: '1000+', title: 'The Official Site Stream'}],'site-stream');
  }});
  getLiveStreamerData(featuredNames)
  //get featured Streamers and append them first
  .then((featuredStreamers) => { getLiveStreamerData(otherNames)
  .then((otherStreamers) => { appendStreamers(featuredStreamers);
    //if additional names resort after getting them and then append
    if(additionalNames.length > 0){
      getLiveStreamerData(additionalNames).then((additionalStreamers) => {
        appendStreamers(sortStreamers(otherStreamers,additionalStreamers));
        checkStreamerCount(100);
    });}
    else{
      appendStreamers(otherStreamers);
      checkStreamerCount(100);
    }
  });
  });
};

//  Create our widget named twitch
export default createWidget('twitch', {
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

      // Get the list of users, set to empty if the setting is blank
      const featuredNames = formatNames(this.siteSettings.twitch_sidebar_featured_streamers);
      let otherNames = formatNames(this.siteSettings.twitch_sidebar_streamers);

      let additionalNames = [];
      //if theres more than 100 users in other, divide it into 2 calls. MAX LIMIT OF OTHER IS NOW 200
      if(otherNames.length > 100){ additionalNames = otherNames.slice(100); otherNames = otherNames.slice(0,99); }

      //refer to the function for more doc
      generateStreamers(featuredNames,otherNames,additionalNames);
      setTimeout( function(){
        $("h2#streams-title").attr("title","Click here to refresh!");
        document.getElementById('streams-title').addEventListener('click', () => {
          clearStreamers();
          generateStreamers(featuredNames,otherNames,additionalNames);
        });
      },100);
  return h('div.twitch-container',output);
  }
}
});
