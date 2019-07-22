import { createWidget } from 'discourse/widgets/widget';
import { h } from 'virtual-dom';

const sortStreamers = (streamers) => {
    //if empty object ie {}
    if(Object.keys(streamers).length === 0){
      return [];
    }
    //Descending sort streamers by viewers
    return new Map([...Object.entries(streamers)].sort(function(a,b){
      return b[1] - a[1];
    }));
};
const getSiteStreamData = () => {
  return new Promise(function (resolve, reject){
    $.getJSON(`https://stream.namafia.com/v1/states`, function(data){
        resolve(data.repeat_to_local_nginx.type);
    });
  });
};


const getLiveStreamerData = (names) => {
  //returns a promise so we can use then statements below
  return new Promise(function (resolve, reject){
    let streamers = {};
    let queries = [];
    names.map(name =>
      queries.push($.getJSON(`https://api.twitch.tv/kraken/streams/${name.trim()}?client_id=jnyy96xyqfu0osastfovsclhlzsa7n`, function(data){
        // If the stream is live
        if(data.stream){

          // Channel Name
          const channel_name = data.stream.channel.display_name;
          // Viewer Count
          const channel_viewers = data.stream.viewers;
          streamers[channel_name] = channel_viewers;
        }
    })));
    //after all queries are done, resolve the promise with the streamers
    Promise.all(queries).then(() => {
      resolve(streamers);
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
}


//add streamers to the stream container.
const appendStreamers = (streamers, className = "") => {
  for(let [name, viewcount] of streamers){
      $('div.spinner').removeClass('spinner');
      $('.stream-container').append(`<hr/><a class="streamer ${name} ${className}"
          target="_blank" href="https://twitch.tv/${name}">
            <div class="streamer-wrapper clearfix">
              <div class="streamer-name">${name}</div>
              <div class="viewer-count">${viewcount}</div>
            </div>
      </a>`);
}
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
      const featuredNames = this.siteSettings.twitch_sidebar_featured_streamers.split(",") || {};
      const otherNames = this.siteSettings.twitch_sidebar_streamers.split(",") || {};

      //async check site stream and add to the top if its up
      getSiteStreamData().then((streamStatus) => {
        if(streamStatus === 'connected'){
          prependSiteStream();
        }
      });

      //get featured Streamers and append them first
      getLiveStreamerData(featuredNames).then((featuredStreamers) => {
        //then get the unfeatured Streamers after
        getLiveStreamerData(otherNames).then((otherStreamers) => {
            //append and sort them both here. Featured /should/ be above otherStreamers.
            appendStreamers(sortStreamers(featuredStreamers));
            appendStreamers(sortStreamers(otherStreamers));
            //Wait a teeny bit. then, if there were no streamers appended, let em know.
            setTimeout(function(){
              if($("a.streamer").length < 1) {
                $('div.spinner').removeClass('spinner');
                $('.stream-container').append('<hr/><div class="no-streamer"><span>No Active Streamers</span></div>');
              }
            },30);
        });
      });
    }
  return h('div.twitch-container',output);
  }
});
