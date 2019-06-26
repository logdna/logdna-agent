var getProxyFromURI = require('../../lib/getProxyFromURI');

const connectionManager = require('../../lib/connection-manager');
const linebuffer = require('../../lib/linebuffer');
const fileUtils = require('../../lib/file-utilities');
const apiClient = require('../../lib/api-client');

jest.mock('../../lib/getProxyFromURI');
jest.mock('../../lib/linebuffer');
jest.mock('../../lib/file-utilities');
jest.mock('../../lib/api-client');


getProxyFromURI = jest.fn(() => {return 9});
apiClient.getAuthToken = jest.fn();
fileUtils.streamAllLogs = jest.fn();
jest.useFakeTimers();

describe('lib:connection-manager', function() {

  beforeEach(() => {
      jest.clearAllMocks();
  });

  const fakePost = jest.fn();
  linebuffer.setConnection = jest.fn(() => {return {post: fakePost}});

  it('Server responded with statusCode 200. Autoupdate and restartSelf are false', function() {
    const config = {
      autoupdate: 0
    }
    connectionManager.connectLogServer(config, 'unitTestProgram').then(() => {
      // calls the function passed to setInterval
      setInterval.mock.calls[0][0]();
      setInterval.mock.calls[0][0]();
      // calls the post callback with a successful response
      fakePost.mock.calls[0][2](null, {statusCode: 200}, '{"autoupdate":false}')
      expect(setInterval).toHaveBeenCalled();
      expect(fileUtils.streamAllLogs).not.toHaveBeenCalled();
      expect(fakePost).toHaveBeenCalledTimes(2);
    })
  });
  it('Server request was not successful', function(done) {
      const config = {
        autoupdate: 1
        ,auth_token: 'token'
      }
     connectionManager.connectLogServer(config, 'unitTestProgram').then(() => {
       expect(setInterval).toHaveBeenCalledTimes(1);
       // calls the function passed to setInterval
       setInterval.mock.calls[0][0]();
       setInterval.mock.calls[0][0]();

       // calls the post callback with a successful response
       fakePost.mock.calls[0][2](null, {statusCode: 404}, '{"autoupdate":true}')
       expect(fileUtils.streamAllLogs).toHaveBeenCalledTimes(1);
       expect(fileUtils.streamAllLogs).toHaveBeenCalledWith(config);
       expect(fakePost).toHaveBeenCalledTimes(2);
       done()
     });
  });
  it('Server request was not successful. Authentication failed', function(done) {
      const config = {
        autoupdate: 1
      }
     connectionManager.connectLogServer(config, 'unitTestProgram').then(() => {
       expect(setInterval).toHaveBeenCalledTimes(1);
       // calls the function passed to setInterval
       setInterval.mock.calls[0][0]();
       setInterval.mock.calls[0][0]();

       // calls the post callback with a successful response
       fakePost.mock.calls[0][2](null, {statusCode: 404}, '{"autoupdate":true}')

      expect(apiClient.getAuthToken).toHaveBeenCalled();
       expect(fileUtils.streamAllLogs).toHaveBeenCalledTimes(1);
       expect(fileUtils.streamAllLogs).toHaveBeenCalledWith(config);
       expect(fakePost).toHaveBeenCalledTimes(2);
       done()
     });
  });
});
