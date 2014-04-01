describe 'CachedResource', ->
  {$cachedResource, CachedResource, $httpBackend, resourceInstance} = {}

  beforeEach ->
    module('ngCachedResource')
    inject ($injector) ->
      $cachedResource = $injector.get '$cachedResource'
      $httpBackend = $injector.get '$httpBackend'
      CachedResource = $cachedResource 'class-get-test', '/mock/:id', {id: '@id'}, 
        charge:
          method: "POST"
          cache: false

  afterEach ->
    $httpBackend.verifyNoOutstandingExpectation()
    $httpBackend.verifyNoOutstandingRequest()
    localStorage.clear()

  expectSuccessfulGET = ->
    $httpBackend.expectGET('/mock/1').respond id: 1, magic: 'Here is the response'

  expectFailingGET = ->
    $httpBackend.expectGET('/mock/1').respond 500

  it "has default actions", ->
    for action in ['get', 'query']
      expect( CachedResource ).to.have.property action

  it "binds custom actions", ->
    expect( CachedResource ).to.have.property 'charge'

  describe 'resourceInstance', ->
    beforeEach ->
      expectSuccessfulGET()
      resourceInstance = CachedResource.get id: 1
      $httpBackend.flush()

    it "has default actions", ->
      for action in ['$save', '$remove', '$delete']
        expect( resourceInstance ).to.have.property action

    it "actions with defined .cache property are being skipped by CachedResource", ->
      inject ($cacheFactory) ->
        $httpBackend.expectPOST('/mock/1').respond charged: true
        instance = resourceInstance.$charge id: 1
        $httpBackend.flush()

        expect( instance.charged ).to.equal true
        expect( instance.$promise ).to.be.defined
        expect( instance.$httpPromise ).to.be.undefined

    # TODO
    xit "actions with defined .cache property aren't resolved with CachedResource, but are still being cached to it", ->
        $httpBackend.expectPOST('/mock/1').respond charged: true
        resourceInstance.$charge()
        $httpBackend.flush()

        expect( resourceInstance.charged ).to.equal true
        expect( resourceInstance.$promise ).to.be.defined
        expect( resourceInstance.$httpPromise ).to.be.undefined
