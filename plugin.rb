# name: Twitch_Sidebar
# about: A twitch sidebar that works with discourse-layouts
# version: 0.1
# authors: Roragok

register_asset 'stylesheets/twitch.scss'
enabled_site_setting :twitch_sidebar_user

DiscourseEvent.on(:layouts_ready) do
  DiscourseLayouts::WidgetHelper.add_widget('twitch')
end
