describe 'Protractor Demo App', ->

  searchTweets = element By.model 'query'
  burgerMenu = element By.className 'glyphicon-menu-hamburger'

  beforeEach ->
    browser.get 'http://socialup.herokuapp.com/'
    return

  it 'should search tweets', ->
    searchTweets.sendKeys 'yo'
    return

  it 'should open fab speed dial', ->
    burgerMenu.click()
    return

  return
