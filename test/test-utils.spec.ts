import * as chai from 'chai';
import {expect} from 'chai';
import {match, spy, stub} from 'sinon';
import * as sinonChai from 'sinon-chai';
import {doNothingIfMatch, tick} from './test-utils';

describe('test utils', () => {
  chai.use(sinonChai);

  describe('the doNothingIfMatch function', () => {
    const obj = {hello: (arg: any) => `hello ${arg}`};
    const sinonStub = stub(obj, 'hello');

    afterEach(() => {
      sinonStub.reset();
    });

    it('should not do anything if arguments match matcher', () => {
      doNothingIfMatch(sinonStub, match(42));
      expect(obj.hello(42)).to.be.undefined;
    });

    it('should call through if arguments do not match matcher', () => {
      doNothingIfMatch(sinonStub, match(42));
      expect(obj.hello(3)).to.be.equal('hello 3');
    });
  });

  describe('the tick function', () => {
    const sinonSpy = spy();

    afterEach(() => {
      sinonSpy.resetHistory();
    });

    it('should return a promise that resolves in 0 ms by default', async () => {
      setTimeout(sinonSpy, 0);
      expect(sinonSpy).to.not.have.been.called;
      await tick();
      expect(sinonSpy).to.have.been.called;
    });

    it('should return a promise that resolves after specified time in ms', async () => {
      const delay = 50;
      setTimeout(sinonSpy, delay);
      await tick(delay - 1);
      expect(sinonSpy).to.not.have.been.called;
      await tick(1);
      expect(sinonSpy).to.have.been.called;
    });
  });

});
