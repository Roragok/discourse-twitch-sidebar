import { createWidget } from 'discourse/widgets/widget';
import ComponentConnector from 'discourse/widgets/component-connector';
import { h } from 'virtual-dom';

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
    var output = [];

    // Get the title of the stream box if set.
    if(this.siteSettings.twitch_sidebar_user){
      output.push(h('h2',this.siteSettings.twitch_sidebar_title));

      // Add an hr after the title
      output.push(h('hr',""));
    }


    // add a loader div from w3 schools
    // https://www.w3schools.com/howto/howto_css_loader.asp
    output.push(h('div.stream-container.loader',""));

    //  check if users are set
    if(this.siteSettings.twitch_sidebar_user){
      // Get the list of users
      var names = this.siteSettings.twitch_sidebar_user;

      // split the names into an array of names
      var names_array = names.split(",");

      // initialize counter
      var counter= 0;

      var streamers = [];

      // Iterate through the list of names and query twitch api
      // TODO HANDLE NO ITEMS AT ALL ACTIVE
      for (counter = 0; counter < names_array.length; counter++){

        // Get the json data for each name in the array
        $.getJSON('https://api.twitch.tv/kraken/streams/'+ names_array[counter].trim() + '?client_id=jnyy96xyqfu0osastfovsclhlzsa7n', function(data){

          // If the stream is active.
            if(data.stream){

              // Channel Name
              var channel_name = data.stream.channel.display_name;

              // Viewer Count
              var channel_viewers = data.stream.viewers;

              // Build crappy html to render our items.
              //  I was hoping to push this to output, but it won't get added
              //  so we append the container with each streamer
              if(!$('a.streamer.'+channel_name).length){
                streamers[channel_name] = channel_viewers;

              }

              // Remove shitty loader once we have an item
              $('div.loader').removeClass('loader');
            }
        });
      }
      console.log('yikes');
      var streamer_name;
      for (counter =0; counter<streamers.length;counter++){
        streamer_name = Object.keys(streamers)[counter];
        console.log(streamer_name);
        $('.stream-container').append('<a class="streamer '+ streamer_name + '" target="_blank" href="https://twitch.tv/' + streamer_name +'"><div class="streamer-wrapper clearfix"><div class="streamer-name">' + streamer_name + '</div><div class="viewer-count">' + streamer[streamer_name] + '</div></div></a>');
      }
    }

    return h('div.twitch-container',output);
  }
});
