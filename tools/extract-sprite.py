"""Cut the main figure out of a concept-art sheet and save it as a small transparent 16-bit-style PNG for the game.

Usage (the sheet must be a PNG; convert a webp first with: sips -s format png sheet.webp --out sheet.png):
    python3 tools/extract-sprite.py sheet.png <height-in-pixels> out.png <colours>

<colours> is the palette size (the game uses 48). The picture is shrunk to <height-in-pixels>, reduced to that many colours,
given a hard edge and a one-pixel dark outline, and the game scales it up with no smoothing (2x for bosses, 1.5x for enemies).
Paper-coloured pixels are background; the largest connected shape is kept (the main drawing, not labels or side views); small holes are
filled and big enclosed gaps (between the legs) stay empty. Python standard library only.
"""
import zlib, struct, sys, os
from collections import deque

def read_png(path):
    data=open(path,'rb').read(); pos=8; idat=b''; w=h=ct=bd=0
    while pos<len(data):
        ln,=struct.unpack('>I',data[pos:pos+4]); typ=data[pos+4:pos+8]; body=data[pos+8:pos+8+ln]; pos+=12+ln
        if typ==b'IHDR': w,h,bd,ct,_,_,il=struct.unpack('>IIBBBBB',body); assert bd==8 and il==0,(bd,il)
        elif typ==b'IDAT': idat+=body
    ch={2:3,6:4,0:1,4:2}[ct]; raw=zlib.decompress(idat); stride=w*ch; out=bytearray(h*stride); prev=bytearray(stride); p=0
    for y in range(h):
        f=raw[p]; p+=1; line=bytearray(raw[p:p+stride]); p+=stride
        if f==1:
            for i in range(ch,stride): line[i]=(line[i]+line[i-ch])&255
        elif f==2:
            for i in range(stride): line[i]=(line[i]+prev[i])&255
        elif f==3:
            for i in range(stride):
                a=line[i-ch] if i>=ch else 0; line[i]=(line[i]+((a+prev[i])>>1))&255
        elif f==4:
            for i in range(stride):
                a=line[i-ch] if i>=ch else 0; b=prev[i]; c=prev[i-ch] if i>=ch else 0
                pa=abs(b-c); pb=abs(a-c); pc=abs(a+b-2*c)
                pr=a if (pa<=pb and pa<=pc) else (b if pb<=pc else c)
                line[i]=(line[i]+pr)&255
        out[y*stride:(y+1)*stride]=line; prev=line
    rgb=bytearray(w*h*3)
    for i in range(w*h):
        rgb[i*3:i*3+3]=out[i*ch:i*ch+3] if ch>=3 else bytes([out[i*ch]]*3)
    return w,h,rgb

def write_png(path,w,h,rgba):
    raw=bytearray()
    for y in range(h): raw.append(0); raw+=rgba[y*w*4:(y+1)*w*4]
    def chunk(t,d):
        c=struct.pack('>I',len(d))+t+d; return c+struct.pack('>I',zlib.crc32(t+d)&0xffffffff)
    open(path,'wb').write(b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',w,h,8,6,0,0,0))+chunk(b'IDAT',zlib.compress(bytes(raw),9))+chunk(b'IEND',b''))

def neighbours(w,h,i):
    x=i%w
    if x>0: yield i-1
    if x<w-1: yield i+1
    if i>=w: yield i-w
    if i<w*(h-1): yield i+w

def dilate(m,w,h,n=1):
    for _ in range(n):
        o=bytearray(m)
        for i in range(w*h):
            if m[i]:
                x=i%w
                if x>0: o[i-1]=1
                if x<w-1: o[i+1]=1
                if i>=w: o[i-w]=1
                if i<w*(h-1): o[i+w]=1
        m=o
    return m
def erode(m,w,h,n=1):
    inv=bytearray(1-v for v in m); inv=dilate(inv,w,h,n); return bytearray(1-v for v in inv)


def pixelate(rgba, ow, oh, ncolors=22, outline=(30,18,14)):
    """8-bit look: hard alpha, a small adaptive palette (median cut), a touch more contrast, and a dark one-pixel outline."""
    pix=[]; idx=[]
    for i in range(ow*oh):
        a=rgba[i*4+3]
        if a>=110:
            r,g,b=rgba[i*4],rgba[i*4+1],rgba[i*4+2]
            # a little brightness and a saturation lift so the teal patina and orange glow survive the small palette
            lum=(r+g+b)/3.0
            r=max(0,min(255,int(((r-lum)*1.45+lum)*1.08)));g=max(0,min(255,int(((g-lum)*1.45+lum)*1.08)));b=max(0,min(255,int(((b-lum)*1.45+lum)*1.08)))
            pix.append((r,g,b)); idx.append(i)
    # median cut
    boxes=[pix[:]]
    while len(boxes)<ncolors:
        def score(bx): return len(bx)**0.6*max(max(p[c] for p in bx)-min(p[c] for p in bx) for c in range(3)) if len(bx)>1 else 0
        boxes.sort(key=lambda bx: -score(bx))
        bx=boxes.pop(0)
        if len(bx)<2: boxes.append(bx); break
        rng=[max(p[c] for p in bx)-min(p[c] for p in bx) for c in range(3)]
        c=rng.index(max(rng)); bx.sort(key=lambda p:p[c]); m=len(bx)//2
        boxes.append(bx[:m]); boxes.append(bx[m:])
    pal=[tuple(sum(p[c] for p in bx)//len(bx) for c in range(3)) for bx in boxes if bx]
    def near(p): return min(pal,key=lambda q:(p[0]-q[0])**2+(p[1]-q[1])**2+(p[2]-q[2])**2)
    out=bytearray(ow*oh*4)
    for k,i in enumerate(idx):
        q=near(pix[k]); out[i*4:i*4+4]=bytes([q[0],q[1],q[2],255])
    # outline: opaque pixels touching empty space become the dark outline colour
    res=bytearray(out)
    for y in range(oh):
        for x in range(ow):
            i=(y*ow+x)*4
            if out[i+3]:
                edge=False
                for nx,ny in ((x-1,y),(x+1,y),(x,y-1),(x,y+1)):
                    if nx<0 or ny<0 or nx>=ow or ny>=oh or not out[(ny*ow+nx)*4+3]: edge=True
                if edge:
                    res[i]=(out[i]*50+outline[0]*50)//100; res[i+1]=(out[i+1]*50+outline[1]*50)//100; res[i+2]=(out[i+2]*50+outline[2]*50)//100
    return res

PIXEL=0
HOLE_MAX=1400
def extract(path, out_h, out_path, paper_luma=172, sat=70, fringe=1):
    w,h,rgb=read_png(path)
    ink=bytearray(w*h)
    for i in range(w*h):
        r,g,b=rgb[i*3],rgb[i*3+1],rgb[i*3+2]
        luma=(r*299+g*587+b*114)//1000; s=max(r,g,b)-min(r,g,b)
        ink[i]=1 if (luma<paper_luma or s>sat) else 0
    core=erode(ink,w,h,2)
    # largest component of the eroded mask
    seen=bytearray(w*h); best=[]; 
    for i in range(w*h):
        if core[i] and not seen[i]:
            comp=[i]; seen[i]=1; dq=deque([i])
            while dq:
                j=dq.popleft()
                for k in neighbours(w,h,j):
                    if core[k] and not seen[k]: seen[k]=1; comp.append(k); dq.append(k)
            if len(comp)>len(best): best=comp
    keep=bytearray(w*h)
    for i in best: keep[i]=1
    # grow back to the original ink, a few pixels at a time
    for _ in range(7):
        g=dilate(keep,w,h,1)
        for i in range(w*h):
            if g[i] and ink[i]: keep[i]=1
    # fill holes: everything not reachable from outside the figure is figure
    xs=[i%w for i in range(w*h) if keep[i]]; ys=[i//w for i in range(w*h) if keep[i]]
    x0,x1,y0,y1=min(xs)-3,max(xs)+3,min(ys)-3,max(ys)+3
    x0=max(0,x0);y0=max(0,y0);x1=min(w-1,x1);y1=min(h-1,y1)
    bw,bh=x1-x0+1,y1-y0+1
    outside=bytearray(bw*bh); dq=deque()
    def at(x,y): return keep[(y0+y)*w+x0+x]
    for x in range(bw):
        for y in (0,bh-1):
            if not at(x,y) and not outside[y*bw+x]: outside[y*bw+x]=1; dq.append(y*bw+x)
    for y in range(bh):
        for x in (0,bw-1):
            if not at(x,y) and not outside[y*bw+x]: outside[y*bw+x]=1; dq.append(y*bw+x)
    while dq:
        j=dq.popleft(); x=j%bw; y=j//bw
        for nx,ny in ((x-1,y),(x+1,y),(x,y-1),(x,y+1)):
            if 0<=nx<bw and 0<=ny<bh and not outside[ny*bw+nx] and not at(nx,ny): outside[ny*bw+nx]=1; dq.append(ny*bw+nx)
    # holes: small ones inside the figure are filled (paler paint, glass); big enclosed gaps, such as between the legs, stay empty
    fg=bytearray(bw*bh)
    for j in range(bw*bh): fg[j]=1 if at(j%bw,j//bw) else 0
    seenh=bytearray(bw*bh)
    for j in range(bw*bh):
        if not fg[j] and not outside[j] and not seenh[j]:
            comp=[j]; seenh[j]=1; dq=deque([j])
            while dq:
                q=dq.popleft(); qx=q%bw; qy=q//bw
                for nx,ny in ((qx-1,qy),(qx+1,qy),(qx,qy-1),(qx,qy+1)):
                    if 0<=nx<bw and 0<=ny<bh:
                        k=ny*bw+nx
                        if not fg[k] and not outside[k] and not seenh[k]: seenh[k]=1; comp.append(k); dq.append(k)
            if len(comp)<HOLE_MAX:
                for k in comp: fg[k]=1
    fg=erode(fg,bw,bh,fringe) if fringe else fg
    # downscale with area averaging (premultiplied)
    scale=out_h/bh; ow=max(1,round(bw*scale)); oh=out_h
    rgba=bytearray(ow*oh*4)
    for oy in range(oh):
        sy0=oy/scale; sy1=(oy+1)/scale
        for ox in range(ow):
            sx0=ox/scale; sx1=(ox+1)/scale
            ra=ga=ba=aa=n=0
            for sy in range(int(sy0),min(bh,int(sy1)+1)):
                for sx in range(int(sx0),min(bw,int(sx1)+1)):
                    n+=1
                    if fg[sy*bw+sx]:
                        p=((y0+sy)*w+x0+sx)*3; ra+=rgb[p]; ga+=rgb[p+1]; ba+=rgb[p+2]; aa+=1
            o=(oy*ow+ox)*4
            if aa:
                rgba[o]=ra//aa; rgba[o+1]=ga//aa; rgba[o+2]=ba//aa; rgba[o+3]=min(255,int(255*aa/n*1.15))
    if PIXEL: rgba=pixelate(rgba,ow,oh,PIXEL)
    write_png(out_path,ow,oh,rgba)
    return ow,oh

if __name__=='__main__':
    path,out_h,out_path=sys.argv[1],int(sys.argv[2]),sys.argv[3]
    if len(sys.argv)>4: PIXEL=int(sys.argv[4])
    print(extract(path,out_h,out_path))
