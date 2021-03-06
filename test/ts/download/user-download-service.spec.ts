import {of, throwError, timer} from 'rxjs';
import {mapTo} from 'rxjs/operators';
import {clock, match, restore, SinonStub, stub, useFakeTimers} from 'sinon';
import {ITrackDownloadResult} from 'src/ts/download/download-result';
import {ITrackInfo, IUserInfo, ResourceType} from 'src/ts/download/resource/resource-info';
import {ResourceInfoService} from 'src/ts/download/resource/resource-info-service';
import {TrackDownloadService} from 'src/ts/download/track-download-service';
import {UserDownloadService} from 'src/ts/download/user-download-service';
import {configureChai, useRxTesting} from 'test/ts/test-initializers';

const expect = configureChai();

describe('user download service', () => {
  const rx = useRxTesting();

  const fixture = UserDownloadService;
  const trackOneInfo: ITrackInfo = {title: 'foo'} as ITrackInfo;
  const trackTwoInfo: ITrackInfo = {title: 'bar'} as ITrackInfo;
  const userInfo: IUserInfo = {
    kind: ResourceType.User,
    permalink_url: 'permalinkUrl',
    username: 'some?username/with*special<characters',
  };
  const expectedTrackListInfoUrl = `${userInfo.permalink_url}/tracks`;
  const trackOneDlResult = {trackInfo: trackOneInfo} as ITrackDownloadResult;
  const trackTwoDlResult = {trackInfo: trackTwoInfo} as ITrackDownloadResult;

  let stubGetTrackInfoList$: SinonStub;
  let stubDownloadTrack: SinonStub;

  beforeEach(() => {
    useFakeTimers();

    stubGetTrackInfoList$ = stub(ResourceInfoService, 'getTrackInfoList$');
    stubGetTrackInfoList$.withArgs(expectedTrackListInfoUrl).returns(of([trackOneInfo, trackTwoInfo]));

    stubDownloadTrack = stub(TrackDownloadService, 'download');
    stubDownloadTrack.withArgs(trackOneInfo, match.any).returns(trackOneDlResult);
    stubDownloadTrack.withArgs(trackTwoInfo, match.any).returns(trackTwoDlResult);
  });

  afterEach(() => {
    restore();
  });

  describe('downloading tracks from a user', () => {
    it('should download every track from the user', () => {
      fixture.download$(userInfo);

      expect(stubDownloadTrack).to.have.been.calledTwice;
      expect(stubDownloadTrack.getCall(0).args[0]).to.be.equal(trackOneInfo);
      expect(stubDownloadTrack.getCall(1).args[0]).to.be.equal(trackTwoInfo);
    });

    it('should download to the correct download location', () => {
      const expectedDlLocation = 'some_username_with_special_characters';
      fixture.download$(userInfo);

      expect(stubDownloadTrack).to.have.been.calledTwice;
      stubDownloadTrack.getCalls()
        .forEach((spyCall) => expect(spyCall.args[1]).to.be.equal(expectedDlLocation));
    });

    it('should emit a user download result and complete if download started successfully', () => {
      rx.subscribeTo(fixture.download$(userInfo));

      expect(rx.next).to.have.been.calledOnceWithExactly({
        kind: ResourceType.User,
        tracks: [trackOneDlResult, trackTwoDlResult],
        userInfo,
      });
      expect(rx.complete).to.have.been.called;
    });

    it('should not emit error if fetching track list info takes less than 1 minute', () => {
      stubGetTrackInfoList$.withArgs(expectedTrackListInfoUrl)
        .returns(timer(59999).pipe(mapTo([trackOneInfo, trackTwoInfo])));
      rx.subscribeTo(fixture.download$(userInfo));
      clock.tick(60000);

      expect(rx.error).to.not.have.been.called;
      expect(rx.next).to.have.been.calledOnce;
    });

    it('should emit error if fetching track list info takes 1 minute or more', () => {
      stubGetTrackInfoList$.withArgs(expectedTrackListInfoUrl)
        .returns(timer(60000).pipe(mapTo([trackOneInfo, trackTwoInfo])));
      rx.subscribeTo(fixture.download$(userInfo));
      clock.tick(60001);

      expect(rx.error).to.have.been.called;
      expect(rx.next).to.not.have.been.called;
    });

    it('should return error if there is an error fetching track list info', () => {
      const err = new Error('error fetching track list info');
      stubGetTrackInfoList$.withArgs(expectedTrackListInfoUrl).returns(throwError(err));
      rx.subscribeTo(fixture.download$(userInfo));

      expect(rx.error).to.have.been.called;
      expect(rx.next).to.not.have.been.called;
    });
  });
});
