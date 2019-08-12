import { createWidget } from 'discourse/widgets/widget';
import { h } from 'virtual-dom';

const getSiteStreamData = () => {
  return new Promise(function (resolve, reject){
    $.getJSON(`https://stream.namafia.com/v1/states`, function(data){
        resolve(data.repeat_to_local_nginx.type === 'connected');
    });
  });
};

//adds site stream to stream container. we real code duplicaters now
const prependSiteStream = () => {
  $('div.spinner').removeClass('spinner');
  $('.stream-container').prepend(`<hr/><a class="streamer site-stream"
          target="_blank" href="https://stream.namafia.com">
            <div class="streamer-wrapper clearfix">
              <div class="streamer-name">Site Stream</div>
              <div class="viewer-count">1000+</div>
            </div>
      </a>`);
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

const sortStreamers = (streamers) => {
  //Descending sort streamers by viewers
  function compare(a, b){ return b.viewer_count - a.viewer_count; }
  //converts to a set to remove any dupes
  const sorted = new Set(streamers.sort(compare));
  return sorted;
};

//appends streamers to the stream container.
const appendStreamers = (streamers, className = "") => {
  [...streamers].map(({user_name, viewer_count, title}) => {
      $('div.spinner').removeClass('spinner');
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
      $('div.spinner').removeClass('spinner');
      $('.stream-container').append('<hr/><div class="no-streamer"><span>No Active Streamers</span></div>');
  }},length);
};

const formatNames = (names = "") => {
  //filters empty names, then deletes spaces and joins it together with &user_login for twitch call
  return names.split(",").filter(name => name.trim().length>0).map(name => name.trim());
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
      output.push(h('h2',this.siteSettings.twitch_sidebar_title));
      // add a spinner for while we load
      output.push(h('div.stream-container.spinner',""));

      // Get the list of users, set to empty if the setting is blank
      const featuredNames = formatNames(this.siteSettings.twitch_sidebar_featured_streamers);
      let otherNames = formatNames(this.siteSettings.twitch_sidebar_streamers);

      let additionalNames = [];
      //if theres more than 100 users in other, divide it into 2 calls. MAX LIMIT OF OTHER IS NOW 200
      if(otherNames.length > 100){ additionalNames = otherNames.slice(100); otherNames = otherNames.slice(0,99); }

      //async check site stream and add to the top if its up
      getSiteStreamData().then((siteStreamIsLive) => {
        if(siteStreamIsLive){prependSiteStream();}
      });

      //get featured Streamers and append them first
      getLiveStreamerData(featuredNames)
      .then((featuredStreamers) => { getLiveStreamerData(otherNames)
      .then((otherStreamers) => {
        if(additionalNames.length > 0){
          getLiveStreamerData(additionalNames).then((additionalStreamers) => { appendStreamers(additionalStreamers);});
        }
        //append and sort them both here. Featured /should/ be above otherStreamers.
        appendStreamers(featuredStreamers);
        appendStreamers(otherStreamers);
        //Wait a teeny bit. then, if there were no streamers appended, let em know
        checkStreamerCount(100);
        });
      });
    }
  return h('div.twitch-container',output);
  }
});
