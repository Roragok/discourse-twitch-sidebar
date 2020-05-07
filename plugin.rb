# name: discourse-twitch-sidebar
# about: A twitch sidebar that works with discourse-layouts
# version: 1.1
# authors: Roragok, epok
# url: https://git.roragok.com/namafia/discourse-twitch-sidebar

register_asset 'stylesheets/twitch.scss'
enabled_site_setting :twitch_sidebar_enabled

DiscourseEvent.on(:layouts_ready) do
  DiscourseLayouts::Widget.add('twitch')
end
