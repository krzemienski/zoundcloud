import {match} from 'sinon';
import {Message} from 'src/ts/messaging/message';
import {MessageResponse} from 'src/ts/messaging/message-response';
import {ContentPageMessenger} from 'src/ts/messaging/page/content-page-messenger';
import {DummyMessage} from 'test/ts/messaging/dummy-message';
import {DummyMessageResponse} from 'test/ts/messaging/dummy-message-response';
import {configureChai, useRxTesting, useSinonChrome} from 'test/ts/test-initializers';

const expect = configureChai();

describe('content page messenger', () => {
  const sinonChrome = useSinonChrome();
  const rx = useRxTesting();

  const fixture = ContentPageMessenger;
  const fakeMessage: Message = new DummyMessage('SomeMessageType');

  describe('sending message to extension', () => {
    context('when not expecting a response', () => {
      beforeEach(() => {
        rx.subscribeTo(fixture.sendToExtension$(fakeMessage));
      });

      it('should send message to the extension', () => {
        expect(sinonChrome.runtime.sendMessage).to.have.been.calledOnceWithExactly(fakeMessage);
      });

      it('should return an empty observable', () => {
        expect(rx.next).to.not.have.been.called;
        expect(rx.complete).to.have.been.called;
      });
    });

    context('when expecting a response', () => {
      beforeEach(() => {
        rx.subscribeTo(fixture.sendToExtension$(fakeMessage, true));
      });

      it('should send message to the extension', () => {
        expect(sinonChrome.runtime.sendMessage).to.have.been.calledOnceWithExactly(fakeMessage, match.func);
      });

      describe('the returned observable', () => {
        let sendResponse: (msgResp?: MessageResponse) => void;

        beforeEach(() => {
          sendResponse = sinonChrome.runtime.sendMessage.firstCall.args[1];
        });

        it('should emit the message response when received and complete', () => {
          const fakeResponse: MessageResponse = new DummyMessageResponse('some-content');
          sendResponse(fakeResponse);

          expect(rx.next).to.have.been.calledOnceWithExactly(fakeResponse);
          expect(rx.error).to.not.have.been.called;
          expect(rx.complete).to.have.been.called;
        });

        it('should not emit anything when no message response is received', () => {
          expect(rx.next).to.not.have.been.called;
          expect(rx.error).to.not.have.been.called;
          expect(rx.complete).to.not.have.been.called;
        });

        it('should emit the last error message if cannot connect to extension', () => {
          const errorMsg = 'error message';
          sinonChrome.runtime.lastError = {message: errorMsg};
          sendResponse();

          expect(rx.next).to.not.have.been.called;
          expect(rx.error).to.have.been.calledWithExactly(errorMsg);
        });
      });
    });
  });
});
